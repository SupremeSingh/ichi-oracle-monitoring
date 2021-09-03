import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ethers } from 'ethers';
import { ADDRESSES, TOKENS, CHAIN_ID, APIS } from './configMainnet';
import FARMING_V1_ABI from './abis/FARMING_V1_ABI.json';
import FARMING_V2_ABI from './abis/FARMING_V2_ABI.json';
import ERC20_ABI from './abis/ERC20_ABI.json';
import BMI_STAKING_ABI from './abis/BMI_STAKING_ABI.json';
import ONETOKEN_ABI from './abis/ONETOKEN_ABI.json';
import ONELINK_ABI from './abis/oneLINK_ABI.json';
import ONEETH_ABI from './abis/oneETH_ABI.json';
import UNISWAP_V3_POSITIONS from './abis/UNISWAP_V3_POSITIONS_ABI.json';
import { getPoolRecord } from './getPoolRecord';
import axios from 'axios';

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
  let template = {
    address: TOKENS[tokenName]['address'],
    decimals: TOKENS[tokenName]['decimals'],
    strategy: TOKENS[tokenName]['strategy'],
    tradeUrl: TOKENS[tokenName]['tradeUrl'],
    stimulus_address: '',
    stimulus_name: TOKENS[tokenName]['stimulusName'],
    stimulus_display_name: TOKENS[tokenName]['stimulusDisplayName'],
    stimulus_decimals: 18,
    abi_type: 'ONETOKEN',
    base_name: tokenName.toLowerCase(),
    isV2: TOKENS[tokenName]['isV2']
  }

  if (tokenName == 'onebtc') {
    template.stimulus_decimals = 8,
    template.abi_type = 'ONELINK',
    template.base_name = 'btc'
  }
  if (tokenName == 'onevbtc') {
    template.abi_type = 'ONEETH',
    template.base_name = 'vbtc'
  }
  if (tokenName == 'onewing') {
    template.stimulus_decimals = 9,
    template.abi_type = 'ONEETH',
    template.base_name = 'wing'
  }
  if (tokenName == 'oneeth') {
    template.abi_type = 'ONEETH',
    template.base_name = 'eth'
  }
  if (tokenName == 'onelink') {
    template.abi_type = 'ONELINK',
    template.base_name = 'link'
  }

  template.stimulus_address = TOKENS[template.stimulus_name]['address'];

  return template;
};

const callDebunkOpenAPI = async function(address) {
  let url = APIS.debunk_openapi + "?id=" + address + "&protocol_id=uniswap3";
  return await axios.get(url);
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

  const uniswap_V3_positions = new ethers.Contract(
    ADDRESSES.uniswap_V3_positions,
    UNISWAP_V3_POSITIONS,
    provider
  );

  const attr = await getOneTokenAttributes(itemName.toLowerCase());
  const oneTokenAddress = attr.address;
  const strategyAddress = attr.strategy;
  const stimulusTokenAddress = attr.stimulus_address;
  const stimulusDisplayName = attr.stimulus_display_name;
  const stimulusTokenName = attr.stimulus_name;
  const stimulusDecimals = attr.stimulus_decimals;
  const baseName = attr.base_name;
  const decimals = attr.decimals;
  const tradeUrl = attr.tradeUrl;
  const isV2 = attr.isV2;
  const oneTokenABI = await getABI(attr.abi_type);

  const ICHI = new ethers.Contract(TOKENS['ichi']['address'], ERC20_ABI, provider);
  const stimulusToken = new ethers.Contract(stimulusTokenAddress, ERC20_ABI, provider);
  const USDC = new ethers.Contract(TOKENS['usdc']['address'], ERC20_ABI, provider);
  const oneToken = new ethers.Contract(oneTokenAddress, oneTokenABI, provider);
  const ICHIBPT = new ethers.Contract(ADDRESSES.ICHIBPT, ERC20_ABI, provider);
  const BMI_STAKING = new ethers.Contract(ADDRESSES.bmi_staking, BMI_STAKING_ABI, provider);

  const oneToken_BPT_Farming_Position = await farming_V2.userInfo(
    7,
    oneTokenAddress
  );
  const oneToken_BPT_LP = oneToken_BPT_Farming_Position.amount;

  const oneToken_ICHIBPT = Number(await ICHIBPT.balanceOf(oneTokenAddress));
  const oneToken_USDC = Number(await USDC.balanceOf(oneTokenAddress));
  const oneToken_stimulus = Number(await stimulusToken.balanceOf(oneTokenAddress));
  const oneToken_ichi = Number(await ICHI.balanceOf(oneTokenAddress));
  
  // =================================================================================
  // get balances from the strategy, if it exists

  let strategy_balance_usdc = 0;
  let strategy_balance_usdc_treasury = 0;
  let strategy_balance_stimulus = 0;
  let strategy_balance_onetoken = 0;
  let strategy_balance_ichi = 0;
  let strategy_balance_bmi_usdt = 0;
  let uni_v3_positions = 0;
  if (strategyAddress !== "") {
    strategy_balance_usdc = Number(await USDC.balanceOf(strategyAddress));
    strategy_balance_stimulus = Number(await stimulusToken.balanceOf(strategyAddress));
    strategy_balance_onetoken = Number(await oneToken.balanceOf(strategyAddress));
    strategy_balance_ichi = Number(await ICHI.balanceOf(strategyAddress));
    strategy_balance_ichi = Number(await ICHI.balanceOf(strategyAddress));
    strategy_balance_bmi_usdt = Number(await BMI_STAKING.totalStaked(strategyAddress));
    uni_v3_positions = Number(await uniswap_V3_positions.balanceOf(strategyAddress));
  }

  if (uni_v3_positions > 0) {
    let all_v3_positions = await callDebunkOpenAPI(strategyAddress);
    if (all_v3_positions.data && all_v3_positions.data.portfolio_item_list && 
      all_v3_positions.data.portfolio_item_list.length > 0) {
      for (let i = 0; i < all_v3_positions.data.portfolio_item_list.length; i++ ) {
        let detail = all_v3_positions.data.portfolio_item_list[i].detail;
        if (detail.supply_token_list && detail.supply_token_list.length > 0) {
          let usdc_in_position = 0;
          let isCollateral = false;
          for (let k = 0; k < detail.supply_token_list.length; k++ ) {
            let supply_token = detail.supply_token_list[k];
            if (supply_token.id.toLowerCase() === oneTokenAddress.toLowerCase()) {
              isCollateral = true;
              strategy_balance_onetoken += Number(supply_token.amount) * 10 ** 18;
            }
            if (supply_token.id.toLowerCase() === TOKENS['usdc']['address'].toLowerCase()) {
              usdc_in_position += Number(supply_token.amount) * 10 ** 6;
            }
            if (supply_token.id.toLowerCase() === stimulusTokenAddress.toLowerCase()) {
              strategy_balance_stimulus += Number(supply_token.amount) * 10 ** stimulusDecimals;
            }
          }
          if (isCollateral) {
            strategy_balance_usdc += usdc_in_position;
          } else {
            strategy_balance_usdc_treasury += usdc_in_position;
          }
        }
      }
    }

  }

  let oneToken_stimulus_price = tokenPrices[stimulusTokenName.toLowerCase()];

  let oneTokenCollateralPostions = [];
  let oneTokenStimulusPostions = [];

  let stimulusPositionsUSDValue = 0;
  let collateralPositionsUSDValue = 0;

  let stimulusPositionsAPY = 0;
  let collateralPositionsAPY = 0;

  let oneToken_burned_tokens = 0;

  let BPT_pool = await getPoolRecord(1007, tokenPrices, null);
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

  const oneToken_SUPPLY = await oneToken.totalSupply();

  // =================================================================================
  // get oneToken strategy position, if it exists

  /* if (strategy_balance_onetoken > 0) {
  
    let percentOwnership = strategy_balance_onetoken / Number(oneToken_SUPPLY);
    let usdValue = strategy_balance_onetoken / 10 ** 18;
    let yAPY = 0;

    assets = [];
    assets.push({ M: { 
      name: { S: itemName }, 
      balance: { N: (Number(strategy_balance_onetoken / 10 ** 18)).toString() } 
    }});
    let oneToken_Strategy_Position = {
      name:  { S: itemName + ' Position' },
      LP:  { N: (strategy_balance_onetoken / 10 ** 18).toString() },
      percentOwnership: { N: (percentOwnership * 100).toString() },
      usdValue: { N: usdValue.toString() },
      assets: { L: assets }
    };

    if (stimulusPositionsUSDValue + usdValue > 0) {
      stimulusPositionsAPY = (stimulusPositionsUSDValue * stimulusPositionsAPY + usdValue * yAPY) / 
        (stimulusPositionsUSDValue + usdValue);
    }
    stimulusPositionsUSDValue = stimulusPositionsUSDValue + usdValue;
    oneTokenStimulusPostions.push({ M: oneToken_Strategy_Position });

    //var jsonPretty = JSON.stringify(oneTokenStimulusPostions,null,20);    
    //console.log(jsonPretty);
  } */

  // =================================================================================
  // special oneVBTC logic in this section

  if (itemName == 'oneVBTC') {
    // temp fix for oneVBTC (removing price of burned stablecoins for a specific address from the total)
    oneToken_burned_tokens = await oneToken.getBurnedStablecoin('0xcc71b8a0b9ea458ae7e17fa232a36816f6b27195');
  }

  if (itemName == 'one1INCH') {
    const lpContract = new ethers.Contract(ADDRESSES._1inch_ICHI_LP, ERC20_ABI, provider);
    const strategyLPs = Number(await lpContract.balanceOf(strategyAddress));
    if (strategyLPs > 0) {
      const lp_stimulus = Number(await stimulusToken.balanceOf(ADDRESSES._1inch_ICHI_LP));
      const lp_ichi = Number(await ICHI.balanceOf(ADDRESSES._1inch_ICHI_LP));
      const lpTotal  = Number(await lpContract.totalSupply());
      const ratio = strategyLPs / lpTotal;
      const strategy_lp_ichi = lp_ichi * ratio;  
      const strategy_lp_stimulus = lp_stimulus * ratio;  
      strategy_balance_ichi += strategy_lp_ichi;
      strategy_balance_stimulus += strategy_lp_stimulus;
    }
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

    let oneLINK_67_33_PoolRecord = await getPoolRecord(1008, tokenPrices, null);
    
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

  let ichi_price = tokenPrices['ichi'];
  let usdc_price = tokenPrices['usdc'];
  let usdt_price = 1;

  stimulusPositionsUSDValue = stimulusPositionsUSDValue +
    Number(oneToken_stimulus_price) * (strategy_balance_stimulus / 10 ** stimulusDecimals) +
    usdc_price * (strategy_balance_usdc_treasury / 10 ** 6) +    
    ichi_price * (strategy_balance_ichi / 10 ** 9);

  let oneToken_stimulus_usd =
    Number(oneToken_stimulus_price) * (oneToken_stimulus / 10 ** stimulusDecimals) +
    ichi_price * (oneToken_ichi / 10 ** 9) +
    stimulusPositionsUSDValue;

  let oneToken_collateral_USDC_only =
    usdc_price * (oneToken_USDC / 10 ** 6);

  collateralPositionsUSDValue = collateralPositionsUSDValue +
    strategy_balance_onetoken / 10 ** 18 +
    usdc_price * (strategy_balance_usdc / 10 ** 6) +
    usdt_price * (strategy_balance_bmi_usdt / 10 ** 18);

  let oneToken_collateral_only = oneToken_collateral_USDC_only +
    collateralPositionsUSDValue +
    (oneToken_ICHIBPT / 10 ** 18);

  let oneToken_treasury_backed = 
    ((Number(oneToken_SUPPLY) / 10 ** decimals) * (1 - oneToken_withdrawFee)) - 
    oneToken_collateral_only +
    Number(oneToken_burned_tokens) / 10 ** decimals;

    let oneToken_collateral_list = [];
    oneToken_collateral_list.push({ M: { 
      name: { S: "USDC" }, 
      balance: { N: oneToken_collateral_USDC_only.toString() } 
    }});

    if (oneToken_ICHIBPT > 0) {
      oneToken_collateral_list.push({ M: { name: { S: "ICHIBPT" }, balance: { N: (Number(oneToken_ICHIBPT / 10 ** 18)).toString() } }});
    }

    if (strategy_balance_usdc > 0 
      || strategy_balance_onetoken > 0
      || strategy_balance_bmi_usdt > 0) {
          const assets = [];
      if (strategy_balance_usdc > 0) {
        assets.push({ M: { 
          name: { S: "USDC" }, 
          balance: { N: Number(strategy_balance_usdc / 10 ** 6).toString() } 
        }});
      }
      if (strategy_balance_onetoken > 0) {
        assets.push({ M: { 
          name: { S: TOKENS[itemName.toLowerCase()]['displayName'] }, 
          balance: { N: (Number(strategy_balance_onetoken / 10 ** 18)).toString() } 
        }});
      }
      if (strategy_balance_bmi_usdt > 0) {
        assets.push({ M: { 
          name: { S: "bmiICHICover" }, 
          balance: { N: Number(strategy_balance_bmi_usdt / 10 ** 18).toString() } 
        }});
      }
      oneTokenCollateralPostions.push({ M: { 
        name: { S: 'Vault' }, 
        assets: { L: assets },
      }});
    }
  
    let oneToken_stimulus_list = [];
    oneToken_stimulus_list.push({ M: { 
      name: { S: stimulusDisplayName }, 
      balance: { N: Number(oneToken_stimulus / 10 ** 18).toString() } 
    }});
    if (oneToken_ichi > 0) {
      oneToken_stimulus_list.push({ M: { 
        name: { S: "ICHI" }, 
        balance: { N: Number(oneToken_ichi / 10 ** 9).toString() } 
      }});
    }

    if (strategy_balance_stimulus > 0 || strategy_balance_ichi > 0 || strategy_balance_usdc_treasury > 0) {
      const assets = [];
      if (strategy_balance_stimulus > 0) {
        assets.push({ M: { 
          name: { S: stimulusDisplayName }, 
          balance: { N: Number(strategy_balance_stimulus / 10 ** 18).toString() } 
        }});
      }
      if (strategy_balance_ichi > 0) {
        assets.push({ M: { 
          name: { S: "ICHI" }, 
          balance: { N: Number(strategy_balance_ichi / 10 ** 9).toString() } 
        }});
      }
      if (strategy_balance_usdc_treasury > 0) {
        assets.push({ M: { 
          name: { S: "USDC" }, 
          balance: { N: Number(strategy_balance_usdc_treasury / 10 ** 6).toString() } 
        }});
      }
      oneTokenStimulusPostions.push({ M: { 
        name: { S: 'Vault' }, 
        assets: { L: assets },
      }});
    }

    const oneTokenVersion = isV2 ? 2 : 1;

    let reserveRatio = 0;
    if (oneToken_treasury_backed > 0) {
      reserveRatio = oneToken_stimulus_usd / oneToken_treasury_backed;
    }

    let totalUSDC = (oneToken_USDC + strategy_balance_usdc) / 10 ** 6 +
      strategy_balance_bmi_usdt / 10 ** 18;

    let res = {
      name: itemName.toLowerCase(),
      displayName: itemName,
      base: baseName,
      usdc: totalUSDC,
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
      oneTokenVersion: oneTokenVersion,
      reserveRatio: reserveRatio
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
        'address = :address, ' + 
        'strategy = :strategy, ' + 
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
        'tradeUrl = :tradeUrl, ' +
        'oneTokenVersion = :oneTokenVersion, ' +
        'reserveRatio = :reserveRatio',
      ExpressionAttributeValues: {
        ':baseName': { S: baseName },
        ':address': { S: oneTokenAddress },
        ':strategy': { S: strategyAddress },
        ':displayName': { S: itemName },
        ':usdc': { N: Number(totalUSDC).toString() },
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
        ':tradeUrl': { S: tradeUrl },
        ':oneTokenVersion': { N: Number(oneTokenVersion).toString() },
        ':reserveRatio': { N: Number(reserveRatio).toString() }
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
