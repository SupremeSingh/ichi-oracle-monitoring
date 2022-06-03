import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { dbClient } from '../configMainnet';
import { isFarmExternal, isFarmGeneric, isUnretired } from '../utils/pids';
import { POOLS, LABELS, CHAIN_ID, TOKENS } from './configKovan';
import { getPoolRecord } from './getPoolRecord';

const getExchangeName = async function (poolId: number) {
  if (POOLS.depositPools.includes(poolId)) return '';
  return 'test exchange';
};

const getTradeUrl = function (poolId: number) {
  let isDeposit = POOLS.depositPools.includes(poolId);
  if (isDeposit) {
    let token_name = LABELS[poolId]['lpName'].toLowerCase();
    if (!TOKENS[token_name]) {
      token_name = 'test_' + LABELS[poolId]['lpName'].toLowerCase();
    }
    if (TOKENS[token_name]['tradeUrl']) return TOKENS[token_name]['tradeUrl'];
  } else {
    if (LABELS[poolId]['tradeUrl']) return LABELS[poolId]['tradeUrl'];
  }
  return '';
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateFarm = async (
  tableName: string,
  poolId: number,
  tokenPrices: { [name: string]: number },
  tokenNames: { [name: string]: string },
  knownIchiPerBlock: { [poolId: string]: string }
): Promise<APIGatewayProxyResult> => {
  let pool = await getPoolRecord(poolId, tokenPrices, knownIchiPerBlock);

  let farmPoolId = poolId;
  let farmName = 'V2';
  let searchName = '';

  let tokens = [];

  if (pool['token0'] == '') {
    searchName = farmName.toLowerCase() + '-multi-' + farmPoolId;
  } else {
    let token0 = {
      name: { S: pool['token0'].toLowerCase() },
      displayName: { S: tokenNames[pool['token0'].toLowerCase()] },
      isOneToken: { BOOL: TOKENS[pool['token0']] ? TOKENS[pool['token0'].toLowerCase()]['isOneToken'] : false },
      price: { N: tokenPrices[pool['token0'].toLowerCase()].toString() },
      address: { S: pool['address0'] },
      reserve: { N: Number(pool['reserve0Raw']).toString() },
      decimals: { N: Number(pool['decimals0']).toString() }
    };
    tokens.push({ M: token0 });

    if (pool['token1'] == '') {
      searchName = farmName.toLowerCase() + '-' + pool['token0'].toLowerCase() + '-' + farmPoolId;
    } else {
      searchName =
        farmName.toLowerCase() +
        '-' +
        pool['token0'].toLowerCase() +
        '-' +
        pool['token1'].toLowerCase() +
        '-' +
        farmPoolId;

      let token1 = {
        name: { S: pool['token1'].toLowerCase() },
        displayName: { S: tokenNames[pool['token1'].toLowerCase()] },
        isOneToken: { BOOL: TOKENS[pool['token1'].toLowerCase()]['isOneToken'] },
        price: { N: tokenPrices[pool['token1'].toLowerCase()].toString() },
        address: { S: pool['address1'] },
        reserve: { N: Number(pool['reserve1Raw']).toString() },
        decimals: { N: Number(pool['decimals1']).toString() }
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
  let isUpcoming = POOLS.upcomingPools.includes(poolId);
  let isMigrating = POOLS.migratingPools.includes(poolId);
  let isRetired = POOLS.retiredPools.includes(poolId);
  let isDeposit = POOLS.depositPools.includes(poolId);
  let isVault = POOLS.activeVaults.includes(poolId);

  let exchange = await getExchangeName(poolId);

  let displayName = LABELS[poolId]['name'];
  let lpName = LABELS[poolId]['lpName'];
  let shortLpName = LABELS[poolId]['shortLpName'];

  let lpPrice = 0;
  if (pool['totalPoolLP'] && Number(pool['totalPoolLP']) > 0 && pool['tvl'] && Number(pool['tvl']) > 0) {
    lpPrice = (Number(pool['tvl']) * 10 ** 18) / Number(pool['totalPoolLP']);
    lpPrice = Math.round(lpPrice * 100) / 100;
  }

  let extras = {};
  if (LABELS[poolId]) {
    if (LABELS[poolId]['externalUrl']) {
      extras['externalUrl'] = { S: LABELS[poolId]['externalUrl'] };
    }
    if (LABELS[poolId]['externalText']) {
      extras['externalText'] = { S: LABELS[poolId]['externalText'] };
    }
    if (LABELS[poolId]['externalButton']) {
      extras['externalButton'] = { S: LABELS[poolId]['externalButton'] };
    }
  }
  const tradeUrl = getTradeUrl(poolId);
  if (tradeUrl != '') {
    extras['tradeUrl'] = { S: tradeUrl };
  }

  let farm = {};
  if (LABELS[poolId]) {
    if (LABELS[poolId]['farmAddress']) {
      farm['farmAddress'] = { S: LABELS[poolId]['farmAddress'] };
      farm['farmId'] = { N: Number(LABELS[poolId]['farmId']).toString() };
    }
    if (LABELS[poolId]['farmRewardTokenName']) {
      farm['farmRewardTokenName'] = { S: LABELS[poolId]['farmRewardTokenName'] };
    }
    if (LABELS[poolId]['farmRewardTokenDecimals']) {
      farm['farmRewardTokenDecimals'] = { N: Number(LABELS[poolId]['farmRewardTokenDecimals']).toString() };
    }
    if (LABELS[poolId]['farmRewardTokenAddress']) {
      farm['farmRewardTokenAddress'] = { S: LABELS[poolId]['farmRewardTokenAddress'] };
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
      ':chainId': { N: Number(CHAIN_ID).toString() },
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
