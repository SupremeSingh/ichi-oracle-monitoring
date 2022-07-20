import { APIGatewayProxyEvent } from 'aws-lambda';
import { updateTokens } from './updateTokens';
import { updateTreasury } from './updateTreasury';
import { updateFarms } from './updateFarms';
import { updateFarm } from './updateFarm';
import { dbClient } from '../configMainnet';
import { ChainId, EnvUtils, KovanPoolNumbers, TokenName } from '@ichidao/ichi-sdk';
import { PartialRecord } from '@ichidao/ichi-sdk/dist/src/types/common';

const tokenTableName = process.env.TOKEN_TABLE_NAME || 'token-dev';
const treasuryTableName = process.env.TREASURY_TABLE_NAME || 'treasury-dev';
const farmsTableName = process.env.FARMS_TABLE_NAME || 'farms-dev';
const ichiPerBlockTableName = process.env.ICHI_PER_BLOCK_TABLE_NAME || 'ichi-per-block';

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

  await updateTokens(tokenTableName, ChainId.Kovan);

  const tokenPrices: PartialRecord<TokenName, number> = {};
  const tokenNames = {};
  tokenNames['eth'] = 'ETH';

  let params = {
    TableName: tokenTableName,
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
    TableName: tokenTableName,
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

  const knownIchiPerBlock: PartialRecord<KovanPoolNumbers, number> = {};

  let params_ipb = {
    TableName: ichiPerBlockTableName
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
    await updateFarms(farmsTableName, tokenPrices, tokenNames, knownIchiPerBlock, ChainId.Kovan);
    await updateTreasury(treasuryTableName, tokenPrices, ChainId.Kovan);
  } else {
    await updateFarm(farmsTableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, ChainId.Kovan);
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
