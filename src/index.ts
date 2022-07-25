import { APIGatewayProxyEvent } from 'aws-lambda';
import { updateTokens } from './updateTokens';
import { updateTreasury } from './updateTreasury';
import { updateFarms } from './updateFarms';
import { updateTokens as updateTokensPolygon } from './polygon/updateTokens';
import { updateTreasury as updateTreasuryPolygon } from './polygon/updateTreasury';
import { updateFarms as updateFarmsPolygon } from './polygon/updateFarms';
import { updateFarm } from './updateFarm';
import { updateFarm as updateFarmKovan } from './kovan/updateFarm';
import { updateFarm as updateFarmMumbai } from './mumbai/updateFarm';
import {
  ChainId,
  EnvUtils,
  isFarmV2Kovan,
  isFarmV2Mumbai,
  isFarmV2Polygon,
  PartialRecord,
  TokenName
} from '@ichidao/ichi-sdk';
import { getAllData, getDynamoTokens } from './dynamo';

const tokenTableName = process.env.TOKEN_TABLE_NAME || 'token-dev';
const treasuryTableName = process.env.TREASURY_TABLE_NAME || 'treasury-dev';
const farmsTableName = process.env.FARMS_TABLE_NAME || 'farms-dev';
const ichiPerBlockTableName = process.env.ICHI_PER_BLOCK_TABLE_NAME || 'ichi-per-block';

EnvUtils.validateEnvironment();

export const handler = async (event: APIGatewayProxyEvent) => {
  let poolId = -1;

  if (event.queryStringParameters && event.queryStringParameters.poolId) {
    console.log('Received poolId from pathParameters: ' + event.queryStringParameters.poolId);
    poolId = Number(event.queryStringParameters.poolId);
  }

  if (poolId === -1) {
    await updateTokens(tokenTableName, ChainId.Mainnet);
    await updateTokensPolygon(tokenTableName, ChainId.Polygon);
  }

  const tokenPrices: PartialRecord<TokenName, number> = {};
  const tokenNames: PartialRecord<TokenName, string> = {};
  tokenNames[TokenName.ETH] = 'ETH';

  try {
    const results = await getDynamoTokens(tokenTableName, false, ChainId.Mainnet);
    for (const item of results) {
      const tokenName = item['tokenName']['S'];
      tokenPrices[tokenName] = Number(item['price']['N']);
      tokenNames[tokenName] = item['displayName']['S'];
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  try {
    const results = await getDynamoTokens(tokenTableName, true, ChainId.Mainnet);
    for (const item of results) {
      const tokenName = item['tokenName']['S'];
      tokenPrices[tokenName] = Number(item['price']['N']);
      tokenNames[tokenName] = item['displayName']['S'];
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  const knownIchiPerBlock = {};

  const params = {
    TableName: ichiPerBlockTableName
  };
  try {
    const results = await getAllData(params);
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
    await updateFarmsPolygon(farmsTableName, tokenPrices, tokenNames, knownIchiPerBlock, ChainId.Polygon);
    await updateTreasuryPolygon(treasuryTableName, tokenPrices, ChainId.Polygon);
    await updateFarms(farmsTableName, tokenPrices, tokenNames, knownIchiPerBlock, ChainId.Mainnet);
    await updateTreasury(treasuryTableName, tokenPrices, tokenNames, ChainId.Mainnet);
  } else {
    if (isFarmV2Kovan(poolId)) {
      // Kovan farms
      await updateFarmKovan(farmsTableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, ChainId.Kovan);
    } else if (isFarmV2Polygon(poolId)) {
      // Polygon farms
      await updateFarm(
        farmsTableName,
        poolId,
        tokenPrices,
        tokenNames,
        knownIchiPerBlock,
        false,
        false,
        ChainId.Polygon
      );
    } else if (isFarmV2Mumbai(poolId)) {
      // Mumbai farms
      await updateFarmMumbai(farmsTableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, ChainId.Mumbai);
    } else {
      // Mainnet farms
      await updateFarm(
        farmsTableName,
        poolId,
        tokenPrices,
        tokenNames,
        knownIchiPerBlock,
        false,
        false,
        ChainId.Mainnet
      );
    }
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
