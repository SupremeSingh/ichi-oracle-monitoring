import { APIGatewayProxyEvent } from 'aws-lambda';
import { updateTokens } from './updateTokens';
import { updateTreasury } from './updateTreasury';
import { updateFarms } from './updateFarms';
import { updateFarm } from './updateFarm';
import { ChainId, EnvUtils } from '@ichidao/ichi-sdk';
import { getTokenPrices } from '../utils/tokenPrices';
import { getTokenNames } from '../utils/tokenNames';
import { getIchiPerBlock } from '../utils/ichiPerBlock';

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

  const tokenPrices = await getTokenPrices(tokenTableName, ChainId.Mumbai);
  const tokenNames = await getTokenNames(tokenTableName, ChainId.Mumbai);
  let knownIchiPerBlock = await getIchiPerBlock(ichiPerBlockTableName);

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
