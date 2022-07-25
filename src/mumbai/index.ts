import { APIGatewayProxyEvent } from 'aws-lambda';
import { updateTokens } from './updateTokens';
import { updateTreasury } from './updateTreasury';
import { updateFarms } from './updateFarms';
import { updateFarm } from './updateFarm';
import { dbClient } from '../configMainnet';
import { ChainId, EnvUtils, PartialRecord, TokenName } from '@ichidao/ichi-sdk';
import { getAllData, getDynamoTokens } from '../dynamo';

const tokenTableName = process.env.TOKEN_TABLE_NAME || 'token-dev';
const treasuryTableName = process.env.TREASURY_TABLE_NAME || 'treasury-dev';
const farmsTableName = process.env.FARMS_TABLE_NAME || 'farms-dev';
const ichiPerBlockTableName = process.env.ICHI_PER_BLOCK_TABLE_NAME || 'ichi-per-block';

EnvUtils.validateEnvironment();

export const handler = async (event: APIGatewayProxyEvent) => {
  let poolId = -1;

  if (event.queryStringParameters && event.queryStringParameters.poolId) {
    console.log('Received poolId from queryStringParameters: ' + event.queryStringParameters.poolId);
    poolId = Number(event.pathParameters.poolId);
  }

  await updateTokens(tokenTableName, ChainId.Mumbai);

  const tokenPrices: PartialRecord<TokenName, number> = {};
  const tokenNames: PartialRecord<TokenName, string> = {};
  tokenNames[TokenName.ETH] = 'ETH';

  try {
    const results = await getDynamoTokens(tokenTableName, false, ChainId.Polygon);
    for (const item of results) {
      const tokenName = item['tokenName']['S'];
      tokenPrices[tokenName] = Number(item['price']['N']);
      tokenNames[tokenName] = item['displayName']['S'];
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  try {
    const results = await getDynamoTokens(tokenTableName, true, ChainId.Polygon);
    for (const item of results) {
      const tokenName = item['tokenName']['S'];
      tokenPrices[tokenName] = Number(item['price']['N']);
      tokenNames[tokenName] = item['displayName']['S'];
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  const knownIchiPerBlock = {};

  let params_ipb = {
    TableName: ichiPerBlockTableName
  };
  try {
    const results = await getAllData(params_ipb);
    for (const item of results) {
      const poolId = item['poolId']['N'];
      knownIchiPerBlock[poolId] = item['ichiPerBlock']['N'];
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  //console.log(tokenPrices);
  //console.log(tokenNames);
  //console.log(knownIchiPerBlock);

  if (poolId === -1) {
    await updateFarms(farmsTableName, tokenPrices, tokenNames, knownIchiPerBlock, ChainId.Mumbai);
    await updateTreasury(treasuryTableName, tokenPrices, ChainId.Mumbai);
  } else {
    await updateFarm(farmsTableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, ChainId.Mumbai);
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
