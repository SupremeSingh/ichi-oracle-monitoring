import { APIGatewayProxyEvent } from 'aws-lambda';
import { updateTokens } from './updateTokens';
import { updateTreasury } from './updateTreasury';
import { updateFarms } from './updateFarms';
import { updateFarm } from './updateFarm';
import { dbClient } from '../configMainnet';
import { ChainId, EnvUtils } from '@ichidao/ichi-sdk';

const token_tableName = process.env.TOKEN_TABLE_NAME || 'token-dev';
const treasury_tableName = process.env.TREASURY_TABLE_NAME || 'treasury-dev';
const farms_tableName = process.env.FARMS_TABLE_NAME || 'farms-dev';
const ichiPerBlock_tableName = process.env.ICHI_PER_BLOCK_TABLE_NAME || 'ichi-per-block';

EnvUtils.validateEnvironment();

const getAllData = async (params) => {
  const _getAllData = async (params, startKey) => {
    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }
    return dbClient.scan(params).promise();
  };

  let lastEvaluatedKey = null;
  let rows = [];

  do {
    const result = await _getAllData(params, lastEvaluatedKey);
    rows = rows.concat(result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return rows;
};

export const handler = async (event: APIGatewayProxyEvent) => {
  let poolId = -1;

  if (event.queryStringParameters && event.queryStringParameters.poolId) {
    console.log('Received poolId from queryStringParameters: ' + event.queryStringParameters.poolId);
    poolId = Number(event.pathParameters.poolId);
  }

  await updateTokens(token_tableName, ChainId.Mumbai);

  const tokenPrices = {};
  const tokenNames = {};
  tokenNames['eth'] = 'ETH';

  let params = {
    TableName: token_tableName,
    FilterExpression: '#isOneToken = :is_one_token',
    ExpressionAttributeNames: {
      '#isOneToken': 'isOneToken'
    },
    ExpressionAttributeValues: { ':is_one_token': { BOOL: false } }
  };
  try {
    const result = await getAllData(params);
    for (let i = 0; i < result.length; i++) {
      let item = result[i];
      let name = item['name']['S'].toLowerCase();
      tokenPrices[name] = Number(item['price']['N']);
      tokenNames[name] = item['displayName']['S'];
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  params = {
    TableName: token_tableName,
    FilterExpression: '#isOneToken = :is_one_token',
    ExpressionAttributeNames: {
      '#isOneToken': 'isOneToken'
    },
    ExpressionAttributeValues: { ':is_one_token': { BOOL: true } }
  };
  try {
    const result = await getAllData(params);
    for (let i = 0; i < result.length; i++) {
      let item = result[i];
      let name = item['name']['S'].toLowerCase();
      tokenPrices[name] = Number(item['price']['N']);
      tokenNames[name] = item['displayName']['S'];
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  const knownIchiPerBlock = {};

  let params_ipb = {
    TableName: ichiPerBlock_tableName
  };
  try {
    const result = await getAllData(params_ipb);
    for (let i = 0; i < result.length; i++) {
      let item = result[i];
      let poolId = item['poolId']['N'];
      knownIchiPerBlock[poolId] = item['ichiPerBlock']['N'];
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  //console.log(tokenPrices);
  //console.log(tokenNames);
  //console.log(knownIchiPerBlock);

  if (poolId === -1) {
    await updateFarms(farms_tableName, tokenPrices, tokenNames, knownIchiPerBlock, ChainId.Mumbai);
    await updateTreasury(treasury_tableName, tokenPrices, ChainId.Mumbai);
  } else {
    await updateFarm(farms_tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, ChainId.Mumbai);
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,GET'
    }
  };
};
