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
import { ChainId, EnvUtils, isFarmV2Kovan, isFarmV2Mumbai, isFarmV2Polygon } from '@ichidao/ichi-sdk';
import { getTokenPrices } from './utils/tokenPrices';
import { getTokenNames } from './utils/tokenNames';
import { getIchiPerBlock } from './utils/ichiPerBlock';

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

  const mainnetTokenPrices = await getTokenPrices(tokenTableName, ChainId.Mainnet);
  const mainnetTokenNames = await getTokenNames(tokenTableName, ChainId.Mainnet);

  const polygonTokenPrices = await getTokenPrices(tokenTableName, ChainId.Polygon);
  const polygonTokenNames = await getTokenNames(tokenTableName, ChainId.Polygon);

  let knownIchiPerBlock = await getIchiPerBlock(ichiPerBlockTableName);

  //console.log(tokenPrices);
  //console.log(tokenNames);
  //console.log(knownIchiPerBlock);

  if (poolId === -1) {
    await updateFarmsPolygon(farmsTableName, polygonTokenPrices, polygonTokenNames, knownIchiPerBlock, ChainId.Polygon);
    await updateTreasuryPolygon(treasuryTableName, polygonTokenPrices, ChainId.Polygon);

    await updateFarms(farmsTableName, mainnetTokenPrices, mainnetTokenNames, knownIchiPerBlock, ChainId.Mainnet);
    await updateTreasury(treasuryTableName, mainnetTokenPrices, mainnetTokenNames, ChainId.Mainnet);
  } else {
    if (isFarmV2Kovan(poolId)) {
      // Kovan farms
      const kovanTokenPrices = await getTokenPrices(tokenTableName, ChainId.Kovan);
      const kovanTokenNames = await getTokenNames(tokenTableName, ChainId.Kovan);
      await updateFarmKovan(
        farmsTableName,
        poolId,
        kovanTokenPrices,
        kovanTokenNames,
        knownIchiPerBlock,
        ChainId.Kovan
      );
    } else if (isFarmV2Polygon(poolId)) {
      // Polygon farms
      await updateFarm(
        farmsTableName,
        poolId,
        polygonTokenPrices,
        polygonTokenNames,
        knownIchiPerBlock,
        false,
        false,
        ChainId.Polygon
      );
    } else if (isFarmV2Mumbai(poolId)) {
      // Mumbai farms
      const mumbaiTokenPrices = await getTokenPrices(tokenTableName, ChainId.Mumbai);
      const mumbaiTokenNames = await getTokenNames(tokenTableName, ChainId.Mumbai);
      await updateFarmMumbai(
        farmsTableName,
        poolId,
        mumbaiTokenPrices,
        mumbaiTokenNames,
        knownIchiPerBlock,
        ChainId.Mumbai
      );
    } else {
      // Mainnet farms
      await updateFarm(
        farmsTableName,
        poolId,
        mainnetTokenPrices,
        mainnetTokenNames,
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
