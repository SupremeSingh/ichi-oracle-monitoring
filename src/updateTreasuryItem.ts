import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ethers } from 'ethers';
import { ADDRESSES, TOKENS, CHAIN_ID } from './configMainnet';
import FARMING_V1_ABI from './abis/FARMING_V1_ABI.json';
import FARMING_V2_ABI from './abis/FARMING_V2_ABI.json';
import ERC20_ABI from './abis/ERC20_ABI.json';
import ONETOKEN_ABI from './abis/ONETOKEN_ABI.json';
import ONELINK_ABI from './abis/oneLINK_ABI.json';
import ONEETH_ABI from './abis/oneETH_ABI.json';
import { getPoolRecord } from './getPoolRecord';

const infuraId = process.env.INFURA_ID;
if (!infuraId) {
  console.error('Please export INFURA_ID=*** which is used for https://mainnet.infura.io/v3/***');
  process.exit();
}

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const RPC_HOST = `https://mainnet.infura.io/v3/${infuraId}`;

const getABI = async function(abiType) {
  if (abiType == 'ONELINK')
    return ONELINK_ABI
  if (abiType == 'ONEETH')
    return ONEETH_ABI
  if (abiType == 'ONETOKEN')
    return ONETOKEN_ABI
  return ONETOKEN_ABI;
};

const getOneTokenAttributes = async function(tokenName) {
  if (tokenName == 'onebtc')
    return {
      address: TOKENS[tokenName]['address'],
      decimals: TOKENS[tokenName]['decimals'],
      stimulus_address: TOKENS['wbtc']['address'],
      stimulus_name: 'wbtc',
      stimulus_display_name: 'BTC',
      stimulus_decimals: 8,
      abi_type: 'ONELINK',
      base_name: 'btc',
      isV2: TOKENS[tokenName]['isV2']
    }
  if (tokenName == 'onevbtc')
    return {
      address: TOKENS[tokenName]['address'],
      decimals: TOKENS[tokenName]['decimals'],
      stimulus_address: TOKENS['vbtc']['address'],
      stimulus_name: 'vbtc',
      stimulus_display_name: 'VBTC',
      stimulus_decimals: 18,
      abi_type: 'ONEETH',
      base_name: 'vbtc',
      isV2: TOKENS[tokenName]['isV2']
    }
  if (tokenName == 'onewing')
    return {
      address: TOKENS[tokenName]['address'],
      decimals: TOKENS[tokenName]['decimals'],
      stimulus_address: TOKENS['pwing']['address'],
      stimulus_name: 'pwing',
      stimulus_display_name: 'WING',
      stimulus_decimals: 9,
      abi_type: 'ONEETH',
      base_name: 'wing',
      isV2: TOKENS[tokenName]['isV2']
    }
  if (tokenName == 'oneeth')
    return {
      address: TOKENS[tokenName]['address'],
      decimals: TOKENS[tokenName]['decimals'],
      stimulus_address: TOKENS['weth']['address'],
      stimulus_name: 'weth',
      stimulus_display_name: 'ETH',
      stimulus_decimals: 18,
      abi_type: 'ONEETH',
      base_name: 'eth',
      isV2: TOKENS[tokenName]['isV2']
    }
  if (tokenName == 'onelink')
    return {
      address: TOKENS[tokenName]['address'],
      decimals: TOKENS[tokenName]['decimals'],
      stimulus_address: TOKENS['link']['address'],
      stimulus_name: 'link',
      stimulus_display_name: 'LINK',
      stimulus_decimals: 18,
      abi_type: 'ONELINK',
      base_name: 'link',
      isV2: TOKENS[tokenName]['isV2']
    }
  return {};
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateTreasuryItem = async (tableName: string, itemName: string, tokenPrices: {[name: string]: number}, 
      tokenNames: {[name: string]: string}): Promise<APIGatewayProxyResult> => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);

  const farming_V1 = new ethers.Contract(
    ADDRESSES.farming_V1,
    FARMING_V1_ABI,
    provider
  );
  const farming_V2 = new ethers.Contract(
    ADDRESSES.farming_V2,
    FARMING_V2_ABI,
    provider
  );

  const attr = await getOneTokenAttributes(itemName.toLowerCase());
  const oneTokenAddress = attr.address;
  const stimulusTokenAddress = attr.stimulus_address;
  const stimulusDisplayName = attr.stimulus_display_name;
  const stimulusTokenName = attr.stimulus_name;
  const stimulusDecimals = attr.stimulus_decimals;
  const baseName = attr.base_name;
  const decimals = attr.decimals;
  const isV2 = attr.isV2;
  const oneTokenABI = await getABI(attr.abi_type);

  const ichi = new ethers.Contract(TOKENS['ichi']['address'], ERC20_ABI, provider);
  const stimulusToken = new ethers.Contract(stimulusTokenAddress, ERC20_ABI, provider);
  const USDC = new ethers.Contract(TOKENS['usdc']['address'], ERC20_ABI, provider);
  const oneToken = new ethers.Contract(oneTokenAddress, oneTokenABI, provider);
  const ICHIBPT = new ethers.Contract(ADDRESSES.ICHIBPT, ERC20_ABI, provider);

  const oneToken_BPT_Farming_Position = await farming_V2.userInfo(
    7,
    oneTokenAddress
  );
  const oneToken_BPT_LP = oneToken_BPT_Farming_Position.amount;

  const oneToken_ICHIBPT = await ICHIBPT.balanceOf(oneTokenAddress);
  const oneToken_USDC = await USDC.balanceOf(oneTokenAddress);
  const oneToken_stimulus = await stimulusToken.balanceOf(oneTokenAddress);
  const oneToken_ichi = await ichi.balanceOf(oneTokenAddress);
  
  let oneToken_stimulus_price = tokenPrices[stimulusTokenName.toLowerCase()];

  let oneTokenCollateralPostions = [];
  let oneTokenStimulusPostions = [];

  let stimulusPositionsUSDValue = 0;
  let collateralPositionsUSDValue = 0;

  let stimulusPositionsAPY = 0;
  let collateralPositionsAPY = 0;

  let oneToken_burned_tokens = 0;

  let BPT_pool = await getPoolRecord(1007, tokenPrices);
  let BPT_poolAPY = BPT_pool['yearlyAPY'];

  const reserveBPT = Number(oneToken_BPT_LP) / 10 ** 18;
  let assets = [];
  assets.push({ M: { 
    name: { S: "ICHIBPT" }, 
    balance: { N: reserveBPT.toString() } 
  }});
  const oneToken_BPT_Position = {
    name: { S: "oneTokens Farm" },
    assets: { L: assets }
  };
  if (collateralPositionsUSDValue + reserveBPT > 0) {
    collateralPositionsAPY = (collateralPositionsUSDValue * collateralPositionsAPY + reserveBPT * BPT_poolAPY) / 
      (collateralPositionsUSDValue + reserveBPT);
  }
  collateralPositionsUSDValue = collateralPositionsUSDValue + reserveBPT;

  // =================================================================================
  // special oneVBTC logic in this section

  if (itemName == 'oneVBTC') {
    // temp fix for oneVBTC (removing price of burned stablecoins for a specific address from the total)
    oneToken_burned_tokens = await oneToken.getBurnedStablecoin('0xcc71b8a0b9ea458ae7e17fa232a36816f6b27195');
  }

  // =================================================================================

  // =================================================================================
  // special oneLINK logic in this section

  if (itemName == 'oneLINK') {
    // temp fix for oneLINK (removing price of burned stablecoins for a specific address from the total)
    oneToken_burned_tokens = await oneToken.getBurnedStablecoin('0x549C0421c69Be943A2A60e76B19b4A801682cBD3');
    //let oneLINK_USDC_num = Number(oneLINK_USDC) / 10 ** 6 - Number(oneLINK_burned_tokens) / 10 ** 9;
  
    let oneLINK_67_33_Farming_Position = await farming_V2.userInfo(
      8,
      TOKENS['onelink']['address']
    );
    let oneLINK_67_33_LP = oneLINK_67_33_Farming_Position.amount;

    let oneLINK_67_33_PoolRecord = await getPoolRecord(1008, tokenPrices);
    
    let totalOneLINKLP = oneLINK_67_33_PoolRecord['totalPoolLP'];
    let percentOwnership = Number(oneLINK_67_33_LP) / Number(totalOneLINKLP);

    let reserve0 = oneLINK_67_33_PoolRecord['reserve0Raw'];
    let reserve1 = oneLINK_67_33_PoolRecord['reserve1Raw'];
    let token0 = oneLINK_67_33_PoolRecord['token0'];
    let token1 = oneLINK_67_33_PoolRecord['token1'];
    let tvl = oneLINK_67_33_PoolRecord['tvl'];
    let usdValue = Number(tvl) * percentOwnership;
    let yAPY = oneLINK_67_33_PoolRecord['yearlyAPY'];

    assets = [];
    assets.push({ M: { 
      name: { S: tokenNames[token0.toLowerCase()] }, 
      balance: { N: (Number(reserve0) * percentOwnership).toString() } 
    }});
    assets.push({ M: { 
      name: { S: tokenNames[token1.toLowerCase()] }, 
      balance: { N: (Number(reserve1) * percentOwnership).toString() } 
    }});
    let oneLINK_67_33_Position = {
      name:  { S: "67/33 ICHI-LINK Farm" },
      LP:  { N: (Number(oneLINK_67_33_LP) / 10 ** 18).toString() },
      percentOwnership: { N: (percentOwnership * 100).toString() },
      usdValue: { N: usdValue.toString() },
      assets: { L: assets }
    };

    if (stimulusPositionsUSDValue + usdValue > 0) {
      stimulusPositionsAPY = (stimulusPositionsUSDValue * stimulusPositionsAPY + usdValue * yAPY) / 
        (stimulusPositionsUSDValue + usdValue);
    }
    stimulusPositionsUSDValue = stimulusPositionsUSDValue + usdValue;
    oneTokenStimulusPostions.push({ M: oneLINK_67_33_Position });
  }

  // =================================================================================


  if (reserveBPT > 0) {
    oneTokenCollateralPostions.push({ M: oneToken_BPT_Position });
  }

  assets = [];
  assets.push({ M: { 
    name: { S: "USDC" }, 
    balance: { N: (Number(oneToken_burned_tokens) / 10 ** decimals).toString() } 
  }});
  if (Number(oneToken_burned_tokens) > 0) {
    let unredeemedCollateralPosition = {
      name: { S: "unredeemed "+itemName },
      assets: { L: assets }
    };
    //oneTokenCollateralPostions.push({ M: unredeemedCollateralPosition });
  }

  let oneToken_withdrawFee = 0;
  if (isV2) {
    oneToken_withdrawFee = Number(await oneToken.redemptionFee()) / 10 ** 18;
  } else {
    oneToken_withdrawFee = Number(await oneToken.withdrawFee()) / 10 ** 11;
  }
  let oneToken_mintFee = 0;
  if (isV2) {
    oneToken_mintFee = Number(await oneToken.mintingFee()) / 10 ** 18;
  } else {
    oneToken_mintFee = Number(await oneToken.mintFee()) / 10 ** 11;
  }
  let oneToken_mintingRatio = 0;
  if (isV2) {
    // assume USDC as collateral for V2 oneTokens for the time being
    const mRatio = await oneToken.getMintingRatio(TOKENS['usdc']['address']);
    oneToken_mintingRatio = Number(mRatio[0]) / 10 ** 18;
  } else {
    oneToken_mintingRatio = Number(await oneToken.reserveRatio()) / 10 ** 11;
  }

  const oneToken_SUPPLY = await oneToken.totalSupply();

  let oneToken_stimulus_usd =
    (Number(oneToken_stimulus_price) * Number(oneToken_stimulus)) /
    10 ** stimulusDecimals +
    stimulusPositionsUSDValue +
    tokenPrices['ichi'] * (oneToken_ichi / 10 ** 9);

  let usdc_price = tokenPrices['usdc'];
  let oneToken_collateral_USDC_only =
    usdc_price * (Number(oneToken_USDC) / 10 ** 6);

  let oneToken_collateral_only = oneToken_collateral_USDC_only +
    collateralPositionsUSDValue + Number(oneToken_ICHIBPT) / 10 ** 18;

  let oneToken_treasury_backed = 
    ((Number(oneToken_SUPPLY) / 10 ** decimals) * (1 - oneToken_withdrawFee)) - 
    oneToken_collateral_only +
    Number(oneToken_burned_tokens) / 10 ** decimals;

    let oneToken_collateral_list = [];
    oneToken_collateral_list.push({ M: { 
      name: { S: "USDC" }, 
//      balance: { N: (oneToken_collateral_USDC_only - oneToken_burned_tokens / 10 ** 9).toString() } 
      balance: { N: oneToken_collateral_USDC_only.toString() } 
    }});

    if (oneToken_ICHIBPT > 0) {
      oneToken_collateral_list.push({ M: { name: { S: "ICHIBPT" }, balance: { N: (Number(oneToken_ICHIBPT) / 10 ** 18).toString() } }});
    }

    let oneToken_stimulus_list = [];
    oneToken_stimulus_list.push({ M: { name: { S: stimulusDisplayName }, balance: { N: (Number(oneToken_stimulus) / 10 ** stimulusDecimals).toString() } }});

    if (Number(oneToken_ichi) > 0) {
      oneToken_stimulus_list.push({ M: { name: { S: "ICHI" }, balance: { N: (Number(oneToken_ichi) / 10 ** 9).toString() } }});
    }

    let res = {
      name: itemName.toLowerCase(),
      displayName: itemName,
      base: baseName,
      usdc: Number(oneToken_USDC) / 10 ** 6,
      circulation: Number(oneToken_SUPPLY) / 10 ** decimals,
      collateral: oneToken_collateral_list,
      collateralPositions: oneTokenCollateralPostions,
      collateralPositionsUSD: collateralPositionsUSDValue,
      collateralUSD: oneToken_collateral_only,
      stimulus: oneToken_stimulus_list,
      stimulusUSD: oneToken_stimulus_usd,
      stimulusPositions: oneTokenStimulusPostions,
      stimulusPositionsUSD: stimulusPositionsUSDValue,
      withdrawFee: oneToken_withdrawFee,
      mintFee: oneToken_mintFee,
      mintingRatio: oneToken_mintingRatio,
      treasuryBacked: oneToken_treasury_backed,
      reserveRatio: oneToken_stimulus_usd / oneToken_treasury_backed
    }

    console.log(res);

    // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03
    console.log(`Attempting to update table: ${tableName}, token: ${itemName}`);
    const params: AWS.DynamoDB.UpdateItemInput = {
      TableName: tableName,
      Key: {
        name: {
          S: itemName.toLowerCase()
        }
      },
      UpdateExpression: 'set ' + 
        'baseName = :baseName, ' + 
        'displayName = :displayName, ' + 
        'usdc = :usdc, ' + 
        'circulation = :circulation, ' + 
        'collateral = :collateral, ' +
        'collateralPositions = :collateralPositions, ' +
        'collateralPositionsAPY = :collateralPositionsAPY, ' +
        'collateralPositionsUSD = :collateralPositionsUSD, ' +
        'collateralUSD = :collateralUSD, ' +
        'stimulus = :stimulus, ' +
        'stimulusUSD = :stimulusUSD, ' +
        'stimulusPositions = :stimulusPositions, ' +
        'stimulusPositionsAPY = :stimulusPositionsAPY, ' +
        'stimulusPositionsUSD = :stimulusPositionsUSD, ' +
        'withdrawFee = :withdrawFee, ' + 
        'mintFee = :mintFee, ' + 
        'mintingRatio = :mintingRatio, ' + 
        'treasuryBacked = :treasuryBacked, ' + 
        'chainId = :chainId, ' +
        'reserveRatio = :reserveRatio',
      ExpressionAttributeValues: {
        ':baseName': { S: baseName },
        ':displayName': { S: itemName },
        ':usdc': { N: (Number(oneToken_USDC) / 10 ** 6).toString() },
        ':circulation': { N: (Number(oneToken_SUPPLY) / 10 ** decimals).toString() },
        ':collateral' : { L: oneToken_collateral_list },
        ':collateralPositions' : { L: oneTokenCollateralPostions },
        ':collateralPositionsAPY' : { N: collateralPositionsAPY.toString() },
        ':collateralPositionsUSD' : { N: Number(collateralPositionsUSDValue).toString() },
        ':collateralUSD': { N: Number(oneToken_collateral_only).toString() },
        ':stimulus' : { L: oneToken_stimulus_list },
        ':stimulusUSD': { N: Number(oneToken_stimulus_usd).toString() },
        ':stimulusPositions' : { L: oneTokenStimulusPostions },
        ':stimulusPositionsAPY' : { N: stimulusPositionsAPY.toString() },
        ':stimulusPositionsUSD' : { N: Number(stimulusPositionsUSDValue).toString() },
        ':withdrawFee': { N: oneToken_withdrawFee.toString() },
        ':mintFee': { N: oneToken_mintFee.toString() },
        ':mintingRatio': { N: oneToken_mintingRatio.toString() },
        ':treasuryBacked': { N: Number(oneToken_treasury_backed).toString() },
        ':chainId': { N: Number(CHAIN_ID).toString() },
        ':reserveRatio': { N: Number(oneToken_stimulus_usd / oneToken_treasury_backed).toString() }
      },
      ReturnValues: 'UPDATED_NEW'
    };

    try {
      // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html#API_UpdateItem_Examples
      const result = await dbClient.updateItem(params).promise();
      console.log(`Successfully updated table: ${tableName}`);
      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } catch (error) {
      throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
    }

};
