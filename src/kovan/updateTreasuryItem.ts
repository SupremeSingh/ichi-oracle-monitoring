import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ethers } from 'ethers';
import { TOKENS, CHAIN_ID } from './configKovan';
import ERC20_ABI from './../abis/ERC20_ABI.json';
import ONETOKEN_ABI from './../abis/ONETOKEN_ABI.json';
import ONELINK_ABI from './../abis/oneLINK_ABI.json';
import ONEETH_ABI from './../abis/oneETH_ABI.json';

const infuraId = process.env.INFURA_ID;
if (!infuraId) {
  console.error('Please export INFURA_ID=*** which is used for https://kovan.infura.io/v3/***');
  process.exit();
}

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const RPC_HOST = `https://kovan.infura.io/v3/${infuraId}`;

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
  if (tokenName == 'oti')
    return {
      address: TOKENS[tokenName]['address'],
      decimals: TOKENS[tokenName]['decimals'],
      strategy: TOKENS[tokenName]['strategy'],
      stimulus_address: TOKENS['token18']['address'],
      stimulus_name: 'token18',
      stimulus_display_name: 'Token18',
      stimulus_decimals: 18,
      collateral_name: 'token6',
      abi_type: 'ONETOKEN',
      base_name: 'oti',
      display_name: 'OTI',
      isV2: TOKENS[tokenName]['isV2']
    }
  if (tokenName == 'test_oneuni')
    return {
      address: TOKENS[tokenName]['address'],
      decimals: TOKENS[tokenName]['decimals'],
      strategy: TOKENS[tokenName]['strategy'],
      stimulus_address: TOKENS['test_uni']['address'],
      stimulus_name: 'test_uni',
      stimulus_display_name: 'UNI',
      stimulus_decimals: 18,
      collateral_name: 'test_usdc',
      abi_type: 'ONETOKEN',
      base_name: 'test_oneuni',
      display_name: 'oneUNI',
      isV2: TOKENS[tokenName]['isV2']
    }
  if (tokenName == 'test_onefil')
    return {
      address: TOKENS[tokenName]['address'],
      decimals: TOKENS[tokenName]['decimals'],
      strategy: TOKENS[tokenName]['strategy'],
      stimulus_address: TOKENS['test_renfil']['address'],
      stimulus_name: 'test_renfil',
      stimulus_display_name: 'renFIL',
      stimulus_decimals: 18,
      collateral_name: 'test_usdc',
      abi_type: 'ONETOKEN',
      base_name: 'test_onefil',
      display_name: 'oneFIL',
      isV2: TOKENS[tokenName]['isV2']
    }
  return {};
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateTreasuryItem = async (tableName: string, itemName: string, tokenPrices: {[name: string]: number}, 
      tokenNames: {[name: string]: string}): Promise<APIGatewayProxyResult> => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);

  const attr = await getOneTokenAttributes(itemName.toLowerCase());
  const oneTokenAddress = attr.address;
  const strategyAddress = attr.strategy;
  const stimulusTokenAddress = attr.stimulus_address;
  const stimulusDisplayName = attr.stimulus_display_name;
  const stimulusTokenName = attr.stimulus_name;
  const stimulusDecimals = attr.stimulus_decimals;
  const usdcName = attr.collateral_name;
  const decimals = attr.decimals;
  const baseName = attr.base_name;
  const displayName = attr.display_name;
  const isV2 = attr.isV2;
  const oneTokenABI = await getABI(attr.abi_type);

  const stimulusToken = new ethers.Contract(stimulusTokenAddress, ERC20_ABI, provider);
  const USDC = new ethers.Contract(TOKENS[usdcName]['address'], ERC20_ABI, provider);
  const oneToken = new ethers.Contract(oneTokenAddress, oneTokenABI, provider);
  const ICHI = new ethers.Contract(TOKENS['test_ichi']['address'], ERC20_ABI, provider);

  // =================================================================================
  // get balances from the strategy, if it exists

  let strategy_balance_usdc = 0;
  let strategy_balance_stimulus = 0;
  let strategy_balance_onetoken = 0;
  let strategy_balance_ichi = 0;
  if (strategyAddress !== "") {
    strategy_balance_usdc = Number(await USDC.balanceOf(strategyAddress));
    strategy_balance_stimulus = Number(await stimulusToken.balanceOf(strategyAddress));
    strategy_balance_onetoken = Number(await oneToken.balanceOf(strategyAddress));
    strategy_balance_ichi = Number(await ICHI.balanceOf(strategyAddress));
  }

  let oneToken_USDC = Number(await USDC.balanceOf(oneTokenAddress));
  const oneToken_stimulus = Number(await stimulusToken.balanceOf(oneTokenAddress));
  const oneToken_ichi = Number(await ICHI.balanceOf(oneTokenAddress));
 
  let oneToken_stimulus_price = tokenPrices[stimulusTokenName.toLowerCase()];

  let oneTokenCollateralPostions = [];
  let oneTokenStimulusPostions = [];

  let stimulusPositionsUSDValue = 0;
  let collateralPositionsUSDValue = 0;

  let stimulusPositionsAPY = 0;
  let collateralPositionsAPY = 0;

  const oneToken_SUPPLY = await oneToken.totalSupply();

  // =================================================================================
  // get oneToken strategy position, if it exists

  /* if (strategy_balance_onetoken > 0) {
  
    let percentOwnership = strategy_balance_onetoken / Number(oneToken_SUPPLY);
    let usdValue = strategy_balance_onetoken / 10 ** 18;
    let yAPY = 0;

    const assets = [];
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
    const mRatio = await oneToken.getMintingRatio(TOKENS[usdcName]['address']);
    oneToken_mintingRatio = Number(mRatio[0]) / 10 ** 18;
  } else {
    oneToken_mintingRatio = Number(await oneToken.reserveRatio()) / 10 ** 11;
  }

  let ichi_price = tokenPrices['test_ichi'];
  let oneToken_stimulus_usd =
    (Number(oneToken_stimulus_price) * (oneToken_stimulus + strategy_balance_stimulus)) / 10 ** stimulusDecimals +
    (ichi_price * (oneToken_ichi + strategy_balance_ichi)) / 10 ** 9 +
    strategy_balance_onetoken / 10 ** 18 +
    stimulusPositionsUSDValue;

  let usdc_price = tokenPrices[usdcName];
  let oneToken_collateral_USDC_only =
    usdc_price * ((oneToken_USDC + strategy_balance_usdc) / 10 ** 6);

  let oneToken_collateral_only = oneToken_collateral_USDC_only +
    collateralPositionsUSDValue;

  let oneToken_treasury_backed = 
    ((Number(oneToken_SUPPLY) / 10 ** decimals) * (1 - oneToken_withdrawFee)) - 
    oneToken_collateral_only;

    let oneToken_collateral_list = [];
    oneToken_collateral_list.push({ M: { 
      name: { S: usdcName }, 
      balance: { N: oneToken_collateral_USDC_only.toString() } 
    }});

    let oneToken_stimulus_list = [];
    oneToken_stimulus_list.push({ M: { 
      name: { S: stimulusDisplayName }, 
      balance: { N: ((oneToken_stimulus + strategy_balance_stimulus) / 10 ** 18).toString() } 
    }});
    if (oneToken_ichi + strategy_balance_ichi > 0) {
      oneToken_stimulus_list.push({ M: { 
        name: { S: "ICHI" }, 
        balance: { N: (Number((oneToken_ichi + strategy_balance_ichi) / 10 ** 9)).toString() } 
      }});
    }
    if (strategy_balance_onetoken > 0) {
      oneToken_stimulus_list.push({ M: { 
        name: { S: TOKENS[itemName.toLowerCase()]['displayName'] }, 
        balance: { N: (Number(strategy_balance_onetoken / 10 ** 18)).toString() } 
      }});
    }
  
    const oneTokenVersion = isV2 ? 2 : 1;

    let reserveRatio = 0;
    if (oneToken_treasury_backed > 0) {
      reserveRatio = oneToken_stimulus_usd / oneToken_treasury_backed;
    }

    let res = {
      name: itemName.toLowerCase(),
      displayName: itemName,
      base: baseName,
      usdc: (oneToken_USDC + strategy_balance_usdc) / 10 ** 6,
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
        'oneTokenVersion = :oneTokenVersion, ' +
        'reserveRatio = :reserveRatio',
      ExpressionAttributeValues: {
        ':baseName': { S: baseName },
        ':displayName': { S: displayName },
        ':usdc': { N: ((oneToken_USDC + strategy_balance_usdc) / 10 ** 6).toString() },
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
