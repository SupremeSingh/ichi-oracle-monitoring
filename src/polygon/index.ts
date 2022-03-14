import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateTreasury } from './updateTreasury';
import { updateFarms } from './updateFarms';
import { updateTokens } from './updateTokens';
import AWS from 'aws-sdk';
import { updateFarm } from './updateFarm';

const token_tableName = process.env.TOKEN_TABLE_NAME || 'token-dev';
const treasury_tableName = process.env.TREASURY_TABLE_NAME || 'treasury-dev';
const farms_tableName = process.env.FARMS_TABLE_NAME || 'farms-dev';

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const getAllData = async (params) => {
  
  const _getAllData = async (params, startKey) => {
    if (startKey) {
      params.ExclusiveStartKey = startKey
    }
    return dbClient.scan(params).promise()
  }

  let lastEvaluatedKey = null
  let rows = []
  
  do {
    const result = await _getAllData(params, lastEvaluatedKey)
    rows = rows.concat(result.Items)
    lastEvaluatedKey = result.LastEvaluatedKey
  } while (lastEvaluatedKey)
  
  return rows
}

export const handler = async (event: APIGatewayProxyEvent) => {
  let poolId = -1;

  if (event.queryStringParameters && event.queryStringParameters.poolId) {
    console.log("Received poolId from pathParameters: " + event.queryStringParameters.poolId);
    poolId = Number(event.queryStringParameters.poolId);
  }

  if (poolId === -1) {
    await updateTokens(token_tableName);
  }

  const tokenPrices = {};
  const tokenNames = {};
  tokenNames['eth'] = 'ETH';

  let params = {
    TableName: token_tableName,
    FilterExpression: "#isOneToken = :is_one_token",
    ExpressionAttributeNames: {
        "#isOneToken": "isOneToken",
    },
    ExpressionAttributeValues: { ":is_one_token": { BOOL: false } }
  };
  try {
    const result = await getAllData(params);
    for (let i = 0; i < result.length; i++) {
      let item = result[i];
      let name = item['name']['S'].toLowerCase();
      tokenPrices[name] = Number(item['price']['N'])
      tokenNames[name] = item['displayName']['S']
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  params = {
    TableName: token_tableName,
    FilterExpression: "#isOneToken = :is_one_token",
    ExpressionAttributeNames: {
        "#isOneToken": "isOneToken",
    },
    ExpressionAttributeValues: { ":is_one_token": { BOOL: true } }
  };
  try {
    const result = await getAllData(params);
    for (let i = 0; i < result.length; i++) {
      let item = result[i];
      let name = item['name']['S'].toLowerCase();
      tokenPrices[name] = Number(item['price']['N'])
      tokenNames[name] = item['displayName']['S']
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  //console.log(tokenPrices);
  //console.log(tokenNames);

  if (poolId === -1) {
    await updateFarms(farms_tableName, tokenPrices, tokenNames, {});
    await updateTreasury(treasury_tableName, tokenPrices, tokenNames);
  } else {
    // Mainnet farms
    await updateFarm(farms_tableName, poolId, tokenPrices, tokenNames, {}, false);
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers" : "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET"
    }
  };

};