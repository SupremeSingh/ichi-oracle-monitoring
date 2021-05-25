import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ethers } from 'ethers';
import { ADDRESSES, TOKENS } from './configMainnet';
import FARMING_V1_ABI from './abis/FARMING_V1_ABI.json';
import FARMING_V2_ABI from './abis/FARMING_V2_ABI.json';
import ERC20_ABI from './abis/ERC20_ABI.json';
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
  return ONEETH_ABI;
};

const getOneTokenAttributes = async function(tokenName) {
  if (tokenName == 'oneBTC')
    return {
      address: TOKENS[tokenName]['address'],
      stimulus_address: TOKENS['wBTC']['address'],
      stimulus_name: 'wBTC',
      stimulus_display_name: 'BTC',
      stimulus_decimals: 8,
      abi_type: 'ONELINK',
      base_name: 'btc'
    }
  if (tokenName == 'oneVBTC')
    return {
      address: TOKENS[tokenName]['address'],
      stimulus_address: TOKENS['vBTC']['address'],
      stimulus_name: 'vBTC',
      stimulus_display_name: 'VBTC',
      stimulus_decimals: 18,
      abi_type: 'ONEETH',
      base_name: 'vbtc'
    }
  if (tokenName == 'oneWING')
    return {
      address: TOKENS[tokenName]['address'],
      stimulus_address: TOKENS['pWING']['address'],
      stimulus_name: 'pWING',
      stimulus_display_name: 'WING',
      stimulus_decimals: 9,
      abi_type: 'ONEETH',
      base_name: 'wing'
    }
  if (tokenName == 'oneETH')
    return {
      address: TOKENS[tokenName]['address'],
      stimulus_address: TOKENS['wETH']['address'],
      stimulus_name: 'wETH',
      stimulus_display_name: 'ETH',
      stimulus_decimals: 18,
      abi_type: 'ONEETH',
      base_name: 'eth'
    }
  if (tokenName == 'oneLINK')
    return {
      address: TOKENS[tokenName]['address'],
      stimulus_address: TOKENS['link']['address'],
      stimulus_name: 'link',
      stimulus_display_name: 'LINK',
      stimulus_decimals: 18,
      abi_type: 'ONELINK',
      base_name: 'link'
    }
  return {};
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateTreasuryItem = async (tableName: string, itemName: string, tokenPrices: any): Promise<APIGatewayProxyResult> => {
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

  const attr = await getOneTokenAttributes(itemName);
  const oneTokenAddress = attr.address;
  const stimulusTokenAddress = attr.stimulus_address;
  const stimulusDisplayName = attr.stimulus_display_name;
  const stimulusTokenName = attr.stimulus_name;
  const stimulusDecimals = attr.stimulus_decimals;
  const baseName = attr.base_name;
  const oneTokenABI = await getABI(attr.abi_type);

  const ichi = new ethers.Contract(TOKENS['ichi']['address'], ERC20_ABI, provider);
  const stimulusToken = new ethers.Contract(stimulusTokenAddress, ERC20_ABI, provider);
  const USDC = new ethers.Contract(TOKENS['USDC']['address'], ERC20_ABI, provider);
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

  const reserveBPT = Number(oneToken_BPT_LP) / 10 ** 18;
  const oneToken_BPT_Position = {
    name: { S: "oneTokens Farm" },
    reserve0: { N: reserveBPT.toString() },
    token0: { S: "ICHIBPT" }
  };
  let oneToken_from_all_pools = reserveBPT;

  let oneTokenCollateralPostions = [];
  let oneTokenStimulusPostions = [];

  let farmPositionsUSDValue = 0;

  let oneToken_burned_tokens = 0;

  // =================================================================================
  // special oneETH logic in this section

  if (itemName == 'oneETH') {
    let oneETH_4_96_Farming_Position = await farming_V2.userInfo(
      3,
      TOKENS['oneETH']['address']
    );
    let oneETH_4_96_LP = oneETH_4_96_Farming_Position.amount;
  
    let oneETH_4_96_PoolRecord = await getPoolRecord(1003, tokenPrices);
    
    let totalOneETHLP = oneETH_4_96_PoolRecord['totalPoolLP'];
    let percentOwnership = Number(oneETH_4_96_LP) / Number(totalOneETHLP);
  
    let reserve0 = oneETH_4_96_PoolRecord['reserve0Raw'];
    let reserve1 = oneETH_4_96_PoolRecord['reserve1Raw'];
    let token0 = oneETH_4_96_PoolRecord['token0'];
    let token1 = oneETH_4_96_PoolRecord['token1'];
    let tvl = oneETH_4_96_PoolRecord['tvl'];
    let usdValue = Number(tvl) * percentOwnership;
  
    let oneETH_4_96_Position = {
      name: { S: "SMART ICHI-ETH Farm" },
      LP: { N: (Number(oneETH_4_96_LP) / 10 ** 18).toString() },
      percentOwnership: { N: (percentOwnership * 100).toString() },
      usdValue: { N: usdValue.toString() },
      reserve0: { N: (Number(reserve0) * percentOwnership).toString() },
      reserve1: { N: (Number(reserve1) * percentOwnership).toString() },
      token0: { S: token0 },
      token1: { S: token1 }
    };
  
    farmPositionsUSDValue = farmPositionsUSDValue + usdValue;
    oneTokenStimulusPostions.push({ M: oneETH_4_96_Position });
  }

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
      TOKENS['oneLINK']['address']
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

    let oneLINK_67_33_Position = {
      name:  { S: "67/33 ICHI-LINK Farm" },
      LP:  { N: (Number(oneLINK_67_33_LP) / 10 ** 18).toString() },
      percentOwnership: { N: (percentOwnership * 100).toString() },
      usdValue: { N: usdValue.toString() },
      reserve0: { N: (Number(reserve0) * percentOwnership).toString() },
      reserve1: { N: (Number(reserve1) * percentOwnership).toString() },
      token0: { S: token0 },
      token1: { S: token1 }
    };

    farmPositionsUSDValue = farmPositionsUSDValue + usdValue;
    oneTokenStimulusPostions.push({ M: oneLINK_67_33_Position });
  }

  // =================================================================================


  if (reserveBPT > 0) {
    oneTokenCollateralPostions.push({ M: oneToken_BPT_Position });
  }

  if (Number(oneToken_burned_tokens) > 0) {
    let unredeemedCollateralPosition = {
      name: { S: "unredeemed "+itemName },
      reserve0: { N: (Number(oneToken_burned_tokens) / 10 ** 9).toString() },
      token0: { S: "USDC" }
    };
    oneTokenCollateralPostions.push({ M: unredeemedCollateralPosition });
  }

  const oneToken_withdrawFee = await oneToken.withdrawFee();
  const oneToken_SUPPLY = await oneToken.totalSupply();

  let oneToken_stimulus_usd =
    (Number(oneToken_stimulus_price) * Number(oneToken_stimulus)) /
    10 ** stimulusDecimals +
    farmPositionsUSDValue +
    tokenPrices['ichi'] * (oneToken_ichi / 10 ** 9);

  let usdc_price = tokenPrices['usdc'];
  let oneToken_collateral_USDC_only =
    usdc_price * (Number(oneToken_USDC) / 10 ** 6);

  let oneToken_collateral_only = oneToken_collateral_USDC_only +
    oneToken_from_all_pools + Number(oneToken_ICHIBPT) / 10 ** 18;

  let oneToken_treasury_backed = 
    ((Number(oneToken_SUPPLY) / 10 ** 9) * (1 - Number(oneToken_withdrawFee) / 10 ** 11)) - 
    oneToken_collateral_only +
    Number(oneToken_burned_tokens) / 10 ** 9;

    let oneToken_collateral_list = [];
    oneToken_collateral_list.push({ M: { 
      name: { S: "USDC" }, 
      balance: { N: (oneToken_collateral_USDC_only - oneToken_burned_tokens / 10 ** 9).toString() } 
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
      name: itemName,
      base: baseName,
      usdc: Number(oneToken_USDC) / 10 ** 6,
      circulation: Number(oneToken_SUPPLY) / 10 ** 9,
      collateral: oneToken_collateral_list,
      collateralPositions: oneTokenCollateralPostions,
      collateralUSD: oneToken_collateral_only,
      stimulus: oneToken_stimulus_list,
      stimulusUSD: oneToken_stimulus_usd,
      stimulusPositions: oneTokenStimulusPostions,
      withdrawFee: Number(oneToken_withdrawFee) / 10 ** 11,
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
          S: itemName
        }
      },
      UpdateExpression: 'set ' + 
        'baseName = :baseName, ' + 
        'usdc = :usdc, ' + 
        'circulation = :circulation, ' + 
        'collateral = :collateral, ' +
        'collateralPositions = :collateralPositions, ' +
        'collateralUSD = :collateralUSD, ' +
        'stimulus = :stimulus, ' +
        'stimulusUSD = :stimulusUSD, ' +
        'stimulusPositions = :stimulusPositions, ' +
        'withdrawFee = :withdrawFee, ' + 
        'treasuryBacked = :treasuryBacked, ' + 
        'reserveRatio = :reserveRatio',
      ExpressionAttributeValues: {
        ':baseName': { S: baseName},
        ':usdc': { N: (Number(oneToken_USDC) / 10 ** 6).toString() },
        ':circulation': { N: (Number(oneToken_SUPPLY) / 10 ** 9).toString() },
        ':collateral' : { L: oneToken_collateral_list },
        ':collateralPositions' : { L: oneTokenCollateralPostions },
        ':collateralUSD': { N: Number(oneToken_collateral_only).toString() },
        ':stimulus' : { L: oneToken_stimulus_list },
        ':stimulusUSD': { N: Number(oneToken_stimulus_usd).toString() },
        ':stimulusPositions' : { L: oneTokenStimulusPostions },
        ':withdrawFee': { N: (Number(oneToken_withdrawFee) / 10 ** 11).toString() },
        ':treasuryBacked': { N: Number(oneToken_treasury_backed).toString() },
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
