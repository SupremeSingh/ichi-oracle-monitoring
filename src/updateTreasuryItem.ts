import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { BigNumber, ContractInterface, ethers } from 'ethers';
import { configMainnet, configKovan } from './config';
import FARMING_V1_ABI from './abis/FARMING_V1_ABI.json';
import FARMING_V2_ABI from './abis/FARMING_V2_ABI.json';
import ERC20_ABI from './abis/ERC20_ABI.json';
import ONELINK_ABI from './abis/oneLINK_ABI.json';
import ONEETH_ABI from './abis/oneETH_ABI.json';

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
      address: configMainnet.oneBTC,
      stimulus_address: configMainnet.wBTC,
      stimulus_name: 'BTC',
      stimulus_decimals: 8,
      abi_type: 'ONELINK',
      base_name: 'btc'
    }
  if (tokenName == 'oneVBTC')
    return {
      address: configMainnet.oneVBTC,
      stimulus_address: configMainnet.vBTC,
      stimulus_name: 'VBTC',
      stimulus_decimals: 18,
      abi_type: 'ONEETH',
      base_name: 'vbtc'
    }
  if (tokenName == 'oneWING')
    return {
      address: configMainnet.oneWING,
      stimulus_address: configMainnet.pWING,
      stimulus_name: 'WING',
      stimulus_decimals: 9,
      abi_type: 'ONEETH',
      base_name: 'wing'
    }
  if (tokenName == 'oneETH')
    return {
      address: configMainnet.oneETH,
      stimulus_address: configMainnet.wETH,
      stimulus_name: 'ETH',
      stimulus_decimals: 18,
      abi_type: 'ONEETH',
      base_name: 'eth'
    }
  return {};
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateTreasuryItem = async (tableName: string, itemName: string, ichiPrice: string): Promise<APIGatewayProxyResult> => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);

  const farming_V1 = new ethers.Contract(
    configMainnet.farming_V1,
    FARMING_V1_ABI,
    provider
  );
  const farming_V2 = new ethers.Contract(
    configMainnet.farming_V2,
    FARMING_V2_ABI,
    provider
  );

  const attr = await getOneTokenAttributes(itemName);
  const oneTokenAddress = attr.address;
  const stimulusTokenAddress = attr.stimulus_address;
  const stimulusTokenName = attr.stimulus_name;
  const stimulusDecimals = attr.stimulus_decimals;
  const baseName = attr.base_name;
  const oneTokenABI = await getABI(attr.abi_type);

  const ichi = new ethers.Contract(configMainnet.ichi, ERC20_ABI, provider);
  const stimulusToken = new ethers.Contract(stimulusTokenAddress, ERC20_ABI, provider);
  const USDC = new ethers.Contract(configMainnet.USDC, ERC20_ABI, provider);
  const oneToken = new ethers.Contract(oneTokenAddress, oneTokenABI, provider);
  const ICHIBPT = new ethers.Contract(configMainnet.ICHIBPT, ERC20_ABI, provider);

  const oneToken_BPT_Farming_Position = await farming_V2.userInfo(
    7,
    oneTokenAddress
  );
  const oneToken_BPT_LP = oneToken_BPT_Farming_Position.amount;

  const oneToken_ICHIBPT = await ICHIBPT.balanceOf(oneTokenAddress);
  const oneToken_USDC = await USDC.balanceOf(oneTokenAddress);
  const oneToken_stimulus = await stimulusToken.balanceOf(oneTokenAddress);
  const oneToken_ichi = await ichi.balanceOf(oneTokenAddress);
  
  let oneToken_stimulus_price;
  if (attr.abi_type == 'ONELINK') {
    oneToken_stimulus_price = await oneToken.getStimulusOracle();
  }
  if (attr.abi_type == 'ONEETH') {
    oneToken_stimulus_price = await oneToken.getStimulusUSD();
  }

  const reserve0 = Number(oneToken_BPT_LP) / 10 ** 18;
  const oneToken_BPT_Position = {
    name: { S: "oneTokens Farm" },
    reserve0: { N: reserve0.toString() },
    token0: { S: "ICHIBPT" }
  };
  let oneToken_from_all_pools = reserve0;

  let oneTokenCollateralPostions = [];

  if (reserve0 > 0) {
    oneTokenCollateralPostions.push({ M: oneToken_BPT_Position });
  }

  const oneToken_withdrawFee = await oneToken.withdrawFee();
  const oneToken_SUPPLY = await oneToken.totalSupply();

  let oneToken_stimulus_usd =
    ((Number(oneToken_stimulus_price) / 10 ** 9) * Number(oneToken_stimulus)) /
    10 ** stimulusDecimals +
    Number(ichiPrice) * (oneToken_ichi / 10 ** 9);

  let usdc_price = 1000000000; // hardcoded until we have a better way to get this price
  let oneToken_collateral_USDC_only =
    (Number(usdc_price) / 10 ** 9) * (Number(oneToken_USDC) / 10 ** 6);

  let oneToken_collateral_only = oneToken_collateral_USDC_only +
    oneToken_from_all_pools + Number(oneToken_ICHIBPT) / 10 ** 18;

  let oneToken_treasury_backed = 
    ((Number(oneToken_SUPPLY) / 10 ** 9) * (1 - Number(oneToken_withdrawFee) / 10 ** 11)) - 
    oneToken_collateral_only;

    let oneToken_collateral_list = [];
    oneToken_collateral_list.push({ M: { name: { S: "USDC" }, balance: { N: oneToken_collateral_USDC_only.toString() } }});

    if (oneToken_ICHIBPT > 0) {
      oneToken_collateral_list.push({ M: { name: { S: "ICHIBPT" }, balance: { N: (Number(oneToken_ICHIBPT) / 10 ** 18).toString() } }});
    }

    let oneToken_stimulus_list = [];
    oneToken_stimulus_list.push({ M: { name: { S: stimulusTokenName }, balance: { N: (Number(oneToken_stimulus) / 10 ** stimulusDecimals).toString() } }});

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
      stimulusAllocation: [],
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
        'base_name = :base_name, ' + 
        'usdc = :usdc, ' + 
        'circulation = :circulation, ' + 
        'collateral = :collateral, ' +
        'collateralPositions = :collateralPositions, ' +
        'collateralUSD = :collateralUSD, ' +
        'stimulus = :stimulus, ' +
        'stimulusUSD = :stimulusUSD, ' +
        'stimulusAllocation = :stimulusAllocation, ' +
        'withdrawFee = :withdrawFee, ' + 
        'treasuryBacked = :treasuryBacked, ' + 
        'reserveRatio = :reserveRatio',
      ExpressionAttributeValues: {
        ':base_name': { S: baseName},
        ':usdc': { N: (Number(oneToken_USDC) / 10 ** 6).toString() },
        ':circulation': { N: (Number(oneToken_SUPPLY) / 10 ** 9).toString() },
        ':collateral' : { L: oneToken_collateral_list },
        ':collateralPositions' : { L: oneTokenCollateralPostions },
        ':collateralUSD': { N: Number(oneToken_collateral_only).toString() },
        ':stimulus' : { L: oneToken_stimulus_list },
        ':stimulusUSD': { N: Number(oneToken_stimulus_usd).toString() },
        ':stimulusAllocation' : { L: [] },
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
