import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ethers } from 'ethers';
import { POOLS, LABELS, CHAIN_ID } from './configKovan';
import { getPoolRecord } from './getPoolRecord';

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

const getExchangeName = async function(poolId: number) {
  if (POOLS.depositPools.includes(poolId))
    return "";
  return "test exchange";
};

export const updateFarmKovan = async (tableName: string, poolId: number, 
  tokenPrices: {[name: string]: number}, 
  tokenNames: {[name: string]: string},
  knownIchiPerBlock: {[poolId: string]: string}): Promise<APIGatewayProxyResult> => {
    return updateFarm(tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock);
}

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateFarm = async (tableName: string, poolId: number, 
    tokenPrices: {[name: string]: number}, 
    tokenNames: {[name: string]: string},
    knownIchiPerBlock: {[poolId: string]: string}): Promise<APIGatewayProxyResult> => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);

  let pool = await getPoolRecord(poolId, tokenPrices, knownIchiPerBlock);

  let farmPoolId = poolId;
  let farmName = 'V2';
  let searchName = '';

  let tokens = [];

  if (pool['token0'] == '') {
    searchName = farmName.toLowerCase()+'-multi-'+farmPoolId;
  } else {
    let token0 = {
      name: { S: pool['token0'].toLowerCase() },
      displayName: { S: tokenNames[pool['token0'].toLowerCase()] },
      address: { S: pool['address0'] },
      reserve: { N: (Number(pool['reserve0Raw'])).toString() },
      decimals: { N: (Number(pool['decimals0'])).toString() }
    };
    tokens.push({ M: token0 });

    if (pool['token1'] == '') {
      searchName = farmName.toLowerCase()+'-'+pool['token0'].toLowerCase()+'-'+farmPoolId;
    } else {
      searchName = farmName.toLowerCase()+'-'+pool['token0'].toLowerCase()+'-'+pool['token1'].toLowerCase()+'-'+farmPoolId;

      let token1 = {
        name: { S: pool['token1'].toLowerCase() },
        displayName: { S: tokenNames[pool['token1'].toLowerCase()] },
        address: { S: pool['address1'] },
        reserve: { N: (Number(pool['reserve1Raw'])).toString() },
        decimals: { N: (Number(pool['decimals1'])).toString() }
      };
      tokens.push({ M: token1 });
    }
  }

  let isExternal = poolId >= 10000;
  let isIchiPool = pool['token0'].toLowerCase() == 'ichi' || 
                    pool['token1'].toLowerCase() == 'ichi' ||
                    pool['token0'].toLowerCase() == 'weenus'; // treat WEENUS-ETH as ichi pool
  let isUpcoming = POOLS.upcomingPools.includes(poolId);
  let isMigrating = POOLS.migratingPools.includes(poolId);
  let isRetired = POOLS.retiredPools.includes(poolId);
  let isDeposit = POOLS.depositPools.includes(poolId);

  let exchange = await getExchangeName(poolId);

  let displayName = LABELS[poolId]['name'];
  let lpName = LABELS[poolId]['lpName'];
  let shortLpName = LABELS[poolId]['shortLpName'];

  let extras = {};
  if (LABELS[poolId]['externalUrl']) {
    extras['externalUrl'] = { S: LABELS[poolId]['externalUrl'] }
  }
  if (LABELS[poolId]['externalText']) {
    extras['externalText'] = { S: LABELS[poolId]['externalText'] }
  }
  if (LABELS[poolId]['externalButton']) {
    extras['externalButton'] = { S: LABELS[poolId]['externalButton'] }
  }
  if (LABELS[poolId]['tradeUrl']) {
    extras['tradeUrl'] = { S: LABELS[poolId]['tradeUrl'] }
  }

  // pool is retired if no rewards are given in it
  if (pool['yearlyAPY'] == 0)
    isRetired = true;

  // oneFIL pool is not retired
  if (poolId == 5003)
    isRetired = false;

    // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03
  console.log(`Attempting to update table: ${tableName}, token: ${poolId}`);
  const params: AWS.DynamoDB.UpdateItemInput = {
    TableName: tableName,
    Key: {
      poolId: {
        N: Number(poolId).toString()
      }
    }, 
    UpdateExpression: 'set ' + 
      'farmPoolId = :farmPoolId, ' + 
      'searchName = :searchName, ' + 
      'displayName = :displayName, ' + 
      'lpName = :lpName, ' + 
      'lpAddress = :lpAddress, ' + 
      'extras = :extras, ' + 
      'shortLpName = :shortLpName, ' + 
      'tokens = :tokens, ' + 
      'exchange = :exchange, ' + 
      'tvl = :tvl, ' + 
      'farmTVL = :farmTVL, ' + 
      'totalPoolLP = :totalPoolLP, ' + 
      'totalFarmLP = :totalFarmLP, ' + 
      'dailyAPY = :dailyAPY, ' + 
      'weeklyAPY = :weeklyAPY, ' + 
      'monthlyAPY = :monthlyAPY, ' + 
      'yearlyAPY = :yearlyAPY, ' + 
      'isExternal = :isExternal, ' + 
      'isUpcoming = :isUpcoming, ' + 
      'isMigrating = :isMigrating, ' + 
      'isRetired = :isRetired, ' + 
      'isIchiPool = :isIchiPool, ' + 
      'isDeposit = :isDeposit, ' + 
      'chainId = :chainId, ' +
      'farmName = :farmName', 
    ExpressionAttributeValues: {
      ':farmPoolId': { N: Number(farmPoolId).toString() },
      ':searchName': { S: searchName },
      ':displayName': { S: displayName },
      ':lpName': { S: lpName },
      ':lpAddress': { S: pool['lpAddress'] },
      ':extras': { M: extras },
      ':shortLpName': { S: shortLpName },
      ':tokens': { L: tokens },
      ':exchange': { S: exchange },
      ':tvl': { N: Number(pool['tvl']).toString() },
      ':farmTVL': { N: Number(pool['farmTVL']).toString() },
      ':totalPoolLP': { S: pool['totalPoolLP'] },
      ':totalFarmLP': { S: pool['totalFarmLP'] },
      ':dailyAPY': { N: Number(pool['dailyAPY']).toString() },
      ':weeklyAPY': { N: Number(pool['weeklyAPY']).toString() },
      ':monthlyAPY': { N: Number(pool['monthlyAPY']).toString() },
      ':yearlyAPY': { N: Number(pool['yearlyAPY']).toString() },
      ':isExternal': { BOOL: isExternal },
      ':isUpcoming': { BOOL: isUpcoming },
      ':isMigrating': { BOOL: isMigrating },
      ':isRetired': { BOOL: isRetired },
      ':isIchiPool': { BOOL: isIchiPool },
      ':isDeposit': { BOOL: isDeposit },
      ':chainId': { N: Number(CHAIN_ID).toString() },
      ':farmName': { S: farmName }
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
