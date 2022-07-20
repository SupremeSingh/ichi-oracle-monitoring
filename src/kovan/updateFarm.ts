import {
  ChainId,
  getExchangeName,
  getPoolLabel,
  getToken,
  isFarmExternal,
  isFarmGeneric,
  isUnretired,
  PartialRecord,
  KovanPoolNumbers,
  Pools,
  TokenName,
  isOneToken
} from '@ichidao/ichi-sdk';
import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { dbClient } from '../configMainnet';
import { getPoolRecord } from './getPoolRecord';

const getTradeUrl = function (poolId: KovanPoolNumbers, chainId: ChainId) {
  let isDeposit = Pools.DEPOSIT_POOLS[chainId].includes(poolId);
  const poolLabel = getPoolLabel(poolId, chainId);
  if (isDeposit) {
    let tokenName = poolLabel.lpName.toLowerCase() as TokenName;
    // TODO: Logic change, this should no longer be necessary
    // if (!getToken(tokenName, { chainId, throwIfNotFound: false })) {
    //   tokenName = 'test_' + poolLabel.lpName.toLowerCase();
    // }
    if (getToken(tokenName, chainId).tradeUrl) {
      return getToken(tokenName, chainId).tradeUrl;
    }
  } else {
    if (poolLabel.tradeUrl) {
      return poolLabel.tradeUrl;
    }
  }
  return '';
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateFarm = async (
  tableName: string,
  poolId: KovanPoolNumbers,
  tokenPrices: PartialRecord<TokenName, number>,
  tokenNames: PartialRecord<TokenName, string>,
  knownIchiPerBlock: PartialRecord<KovanPoolNumbers, number>,
  chainId: ChainId
): Promise<APIGatewayProxyResult> => {
  const pool = await getPoolRecord(poolId, tokenPrices, knownIchiPerBlock, chainId);
  const poolLabel = getPoolLabel(poolId, chainId);

  let farmPoolId = poolId;
  let farmName = 'V2';
  let searchName = '';

  let tokens = [];

  if (pool.token0 == '') {
    searchName = `${farmName.toLowerCase()}-multi-${farmPoolId}`;
  } else {
    let token0 = {
      name: { S: pool.token0.toLowerCase() },
      displayName: { S: tokenNames[pool.token0.toLowerCase()] },
      isOneToken: {
        BOOL: isOneToken(pool.token0, chainId)
      },
      price: { N: tokenPrices[pool.token0.toLowerCase()].toString() },
      address: { S: pool.address0 },
      reserve: { N: Number(pool.reserve0Raw).toString() },
      decimals: { N: Number(pool.decimals0).toString() }
    };
    tokens.push({ M: token0 });

    if (pool.token1 == '') {
      searchName = farmName.toLowerCase() + '-' + pool.token0.toLowerCase() + '-' + farmPoolId;
    } else {
      searchName =
        farmName.toLowerCase() + '-' + pool.token0.toLowerCase() + '-' + pool.token1.toLowerCase() + '-' + farmPoolId;

      let token1 = {
        name: { S: pool.token1.toLowerCase() },
        displayName: { S: tokenNames[pool.token1.toLowerCase()] },
        isOneToken: { BOOL: isOneToken(pool.token1, chainId) },
        price: { N: tokenPrices[pool.token1.toLowerCase()].toString() },
        address: { S: pool.address1 },
        reserve: { N: Number(pool.reserve1Raw).toString() },
        decimals: { N: Number(pool.decimals1).toString() }
      };
      tokens.push({ M: token1 });
    }
  }

  let isExternal = isFarmExternal(poolId);
  let isGeneric = isFarmGeneric(poolId);
  let isIchiPool =
    pool['token0'].toLowerCase() == 'ichi' ||
    pool['token1'].toLowerCase() == 'ichi' ||
    pool['token0'].toLowerCase() == 'weenus'; // treat WEENUS-ETH as ichi pool
  let isUpcoming = Pools.UPCOMING_POOLS[chainId].includes(poolId);
  let isMigrating = Pools.MIGRATING_POOLS[chainId].includes(poolId);
  let isRetired = Pools.RETIRED_POOLS[chainId].includes(poolId);
  let isDeposit = Pools.DEPOSIT_POOLS[chainId].includes(poolId);
  let isVault = Pools.ACTIVE_VAULTS[chainId].includes(poolId);

  let exchange = getExchangeName(poolId, chainId);

  let displayName = poolLabel.name;
  let lpName = poolLabel.lpName;
  let shortLpName = poolLabel.shortLpName;

  let lpPrice = 0;
  if (pool['totalPoolLP'] && Number(pool.totalPoolLP) > 0 && pool.tvl && Number(pool.tvl) > 0) {
    lpPrice = (Number(pool.tvl) * 10 ** 18) / Number(pool.totalPoolLP);
    lpPrice = Math.round(lpPrice * 100) / 100;
  }

  let extras = {};
  if (poolLabel) {
    if (poolLabel.externalUrl) {
      extras['externalUrl'] = { S: poolLabel.externalUrl };
    }
    if (poolLabel.externalText) {
      extras['externalText'] = { S: poolLabel.externalText };
    }
    if (poolLabel.externalButton) {
      extras['externalButton'] = { S: poolLabel.externalButton };
    }
  }
  const tradeUrl = getTradeUrl(poolId, chainId);
  if (tradeUrl != '') {
    extras['tradeUrl'] = { S: tradeUrl };
  }

  let farm = {};
  if (poolLabel) {
    if (poolLabel.farmAddress) {
      farm['farmAddress'] = { S: poolLabel.farmAddress };
      farm['farmId'] = { N: Number(poolLabel.farmId).toString() };
    }
    if (poolLabel.farmRewardTokenName) {
      farm['farmRewardTokenName'] = { S: poolLabel.farmRewardTokenName };
    }
    if (poolLabel.farmRewardTokenDecimals) {
      farm['farmRewardTokenDecimals'] = { N: Number(poolLabel.farmRewardTokenDecimals).toString() };
    }
    if (poolLabel.farmRewardTokenAddress) {
      farm['farmRewardTokenAddress'] = { S: poolLabel.farmRewardTokenAddress };
    }
  }

  // pool is retired if no rewards are given in it
  if (pool['yearlyAPY'] == 0) isRetired = true;

  if (isUnretired(poolId)) isRetired = false;

  let baseTokenTVL = Number(pool['tvl']);

  const isLegacy = false;

  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03
  console.log(`Attempting to update table: ${tableName}, token: ${poolId}`);
  const params: AWS.DynamoDB.UpdateItemInput = {
    TableName: tableName,
    Key: {
      poolId: {
        N: Number(poolId).toString()
      }
    },
    UpdateExpression:
      'set ' +
      'farmPoolId = :farmPoolId, ' +
      'searchName = :searchName, ' +
      'displayName = :displayName, ' +
      'lpName = :lpName, ' +
      'lpAddress = :lpAddress, ' +
      'lpPrice = :lpPrice, ' +
      'extras = :extras, ' +
      'farm = :farm, ' +
      'shortLpName = :shortLpName, ' +
      'tokens = :tokens, ' +
      'exchange = :exchange, ' +
      'tvl = :tvl, ' +
      'baseTokenTVL = :baseTokenTVL, ' +
      'farmTVL = :farmTVL, ' +
      'totalPoolLP = :totalPoolLP, ' +
      'totalFarmLP = :totalFarmLP, ' +
      'dailyAPY = :dailyAPY, ' +
      'weeklyAPY = :weeklyAPY, ' +
      'monthlyAPY = :monthlyAPY, ' +
      'yearlyAPY = :yearlyAPY, ' +
      'isExternal = :isExternal, ' +
      'isGeneric = :isGeneric, ' +
      'isUpcoming = :isUpcoming, ' +
      'isMigrating = :isMigrating, ' +
      'isRetired = :isRetired, ' +
      'isIchiPool = :isIchiPool, ' +
      'isDeposit = :isDeposit, ' +
      'isPosition = :isPosition, ' +
      'isLegacy = :isLegacy, ' +
      'chainId = :chainId, ' +
      'farmName = :farmName',
    ExpressionAttributeValues: {
      ':farmPoolId': { N: Number(farmPoolId).toString() },
      ':searchName': { S: searchName },
      ':displayName': { S: displayName },
      ':lpName': { S: lpName },
      ':lpAddress': { S: pool['lpAddress'] },
      ':lpPrice': { N: Number(lpPrice).toString() },
      ':extras': { M: extras },
      ':farm': { M: farm },
      ':shortLpName': { S: shortLpName },
      ':tokens': { L: tokens },
      ':exchange': { S: exchange },
      ':tvl': { N: Number(pool['tvl']).toString() },
      ':baseTokenTVL': { N: Number(baseTokenTVL).toString() },
      ':farmTVL': { N: Number(pool['farmTVL']).toString() },
      ':totalPoolLP': { S: pool['totalPoolLP'] },
      ':totalFarmLP': { S: pool['totalFarmLP'] },
      ':dailyAPY': { N: Number(pool['dailyAPY']).toString() },
      ':weeklyAPY': { N: Number(pool['weeklyAPY']).toString() },
      ':monthlyAPY': { N: Number(pool['monthlyAPY']).toString() },
      ':yearlyAPY': { N: Number(pool['yearlyAPY']).toString() },
      ':isExternal': { BOOL: isExternal },
      ':isGeneric': { BOOL: isGeneric },
      ':isUpcoming': { BOOL: isUpcoming },
      ':isMigrating': { BOOL: isMigrating },
      ':isRetired': { BOOL: isRetired },
      ':isIchiPool': { BOOL: isIchiPool },
      ':isDeposit': { BOOL: isDeposit },
      ':isPosition': { BOOL: isVault },
      ':isLegacy': { BOOL: isLegacy },
      ':chainId': { N: chainId.toString() },
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
