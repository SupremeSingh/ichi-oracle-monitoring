import { APIGatewayProxyEvent } from 'aws-lambda';
import { updateTreasury } from './updateTreasury';
import { updateFarms } from './updateFarms';
import { updateTokens } from './updateTokens';
import { ChainId, EnvUtils, PartialRecord, TokenName } from '@ichidao/ichi-sdk';
import { updateFarm } from '../updateFarm';
import { getDynamoTokens } from '../dynamo';

const tokenTableName = process.env.TOKEN_TABLE_NAME || 'token-dev';
const treasuryTableName = process.env.TREASURY_TABLE_NAME || 'treasury-dev';
const farmsTableName = process.env.FARMS_TABLE_NAME || 'farms-dev';

EnvUtils.validateEnvironment();

export const handler = async (event: APIGatewayProxyEvent) => {
  let poolId = -1;

  if (event.queryStringParameters && event.queryStringParameters.poolId) {
    console.log('Received poolId from pathParameters: ' + event.queryStringParameters.poolId);
    poolId = Number(event.queryStringParameters.poolId);
  }

  if (poolId === -1) {
    await updateTokens(tokenTableName, ChainId.Polygon);
  }

  const tokenPrices: PartialRecord<TokenName, number> = {};
  const tokenNames: PartialRecord<TokenName, string> = {};
  tokenNames[TokenName.ETH] = 'ETH';

  try {
    const results = await getDynamoTokens(tokenTableName, false, ChainId.Polygon);
    for (const item of results) {
      const tokenName = item['tokenName']['S'].toLowerCase();
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

  //console.log(tokenPrices);
  //console.log(tokenNames);

  if (poolId === -1) {
    await updateFarms(farmsTableName, tokenPrices, tokenNames, {}, ChainId.Polygon);
    await updateTreasury(treasuryTableName, tokenPrices, ChainId.Polygon);
  } else {
    // Polygon farms
    await updateFarm(farmsTableName, poolId, tokenPrices, tokenNames, {}, false, false, ChainId.Polygon);
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
