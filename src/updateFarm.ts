import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ethers } from 'ethers';
import { configMainnet, configKovan, pools, labels } from './config';
import FARMING_V1_ABI from './abis/FARMING_V1_ABI.json';
import FARMING_V2_ABI from './abis/FARMING_V2_ABI.json';
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

const getExchangeName = async function(poolId: number) {
  if (pools.bancorPools.includes(poolId))
    return "bancor";
  if (pools.oneInchPools.includes(poolId))
    return "1inch";
  if (pools.uniPools.includes(poolId))
    return "uni";
  if (pools.loopringPools.includes(poolId))
    return "loopring";
  if (pools.balancerPools.includes(poolId) || pools.balancerSmartPools.includes(poolId))
    return "balancer";
  return "sushi";
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateFarm = async (tableName: string, poolId: number, ichiPrice: string): Promise<APIGatewayProxyResult> => {
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

  let pool = await getPoolRecord(poolId, ichiPrice);
  console.log(pool);

  let farmPoolId = 0;
  let farmName = '';
  let searchName = '';

  if (poolId >= 10000) {
    farmName = 'external';
    farmPoolId = poolId - 10000;
  }
  if (poolId >= 1000 && poolId < 10000) {
    farmName = 'V2'
    farmPoolId = poolId - 1000;
  }
  if (poolId < 1000) {
    farmName = 'V1'
    farmPoolId = poolId;
  }

  let tokens = [];

  if (pool['token0'] == '') {
    searchName = farmName.toLowerCase()+'-multi-'+farmPoolId;
  } else {
    searchName = farmName.toLowerCase()+'-'+pool['token0'].toLowerCase()+'-'+pool['token1'].toLowerCase()+'-'+farmPoolId;

    let token0 = {
      token: { S: pool['token0'] },
      address: { S: pool['address0'] },
      reserve: { N: (Number(pool['reserve0Raw'])).toString() },
      decimals: { N: (Number(pool['decimals0'])).toString() }
    };
    let token1 = {
      token: { S: pool['token1'] },
      address: { S: pool['address1'] },
      reserve: { N: (Number(pool['reserve1Raw'])).toString() },
      decimals: { N: (Number(pool['decimals1'])).toString() }
    };

    tokens.push({ M: token0 });
    tokens.push({ M: token1 });
  }

  let isExternal = poolId >= 10000;
  let isIchiPool = pool['token0'] == 'ICHI' || pool['token1'] == 'ICHI';
  let isUpcoming = pools.upcomingPools.includes(poolId);
  let isMigrating = pools.migratingPools.includes(poolId);
  let isRetired = pools.retiredPools.includes(poolId);

  let exchange = await getExchangeName(poolId);

  let displayName = labels[poolId]['name'];
  let lpName = labels[poolId]['lpName'];
  let shortLpName = labels[poolId]['shortLpName'];

  let extras = {};
  if (labels[poolId]['externalUrl']) {
    extras['externalUrl'] = { S: labels[poolId]['externalUrl'] }
  }
  if (labels[poolId]['externalText']) {
    extras['externalText'] = { S: labels[poolId]['externalText'] }
  }
  if (labels[poolId]['externalButton']) {
    extras['externalButton'] = { S: labels[poolId]['externalButton'] }
  }

  // pool is retired if no rewards are given in it
  if (pool['yearlyAPY'] == 0)
    isRetired = true;

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
      'extras = :extras, ' + 
      'shortLpName = :shortLpName, ' + 
      'tokens = :tokens, ' + 
      'exchange = :exchange, ' + 
      'tvl = :tvl, ' + 
      'farmTVL = :farmTVL, ' + 
      'totalPoolLP = :totalPoolLP, ' + 
      'dailyAPY = :dailyAPY, ' + 
      'weeklyAPY = :weeklyAPY, ' + 
      'yearlyAPY = :yearlyAPY, ' + 
      'isExternal = :isExternal, ' + 
      'isUpcoming = :isUpcoming, ' + 
      'isMigrating = :isMigrating, ' + 
      'isRetired = :isRetired, ' + 
      'isIchiPool = :isIchiPool, ' + 
      'farmName = :farmName', 
    ExpressionAttributeValues: {
      ':farmPoolId': { N: Number(farmPoolId).toString() },
      ':searchName': { S: searchName },
      ':displayName': { S: displayName },
      ':lpName': { S: lpName },
      ':extras': { M: extras },
      ':shortLpName': { S: shortLpName },
      ':tokens': { L: tokens },
      ':exchange': { S: exchange },
      ':tvl': { N: Number(pool['tvl']).toString() },
      ':farmTVL': { N: Number(pool['farmTVL']).toString() },
      ':totalPoolLP': { S: pool['totalPoolLP'] },
      ':dailyAPY': { N: Number(pool['dailyAPY']).toString() },
      ':weeklyAPY': { N: Number(pool['weeklyAPY']).toString() },
      ':yearlyAPY': { N: Number(pool['yearlyAPY']).toString() },
      ':isExternal': { BOOL: isExternal },
      ':isUpcoming': { BOOL: isUpcoming },
      ':isMigrating': { BOOL: isMigrating },
      ':isRetired': { BOOL: isRetired },
      ':isIchiPool': { BOOL: isIchiPool },
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
