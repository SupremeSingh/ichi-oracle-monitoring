import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ADDRESSES, POOLS, LABELS, TOKENS, CHAIN_ID } from './configPolygon';
import { getPoolRecord } from './getPoolRecord';
import { GraphData } from '../subgraph/model';
import { GraphFarm } from '../subgraph/farm_v2';
import { vault_graph_query, Vault, DataPacket, getCurrentVaultValue } from '../subgraph/ichi_vaults';
import { adjustedPid, adjustedPidString, isFarmExternal, isFarmGeneric, isFarmV2, isFarmV2Polygon, isUnretired } from '../utils/pids';
import { VAULT_DECIMAL_TRACKER } from '../utils/vaults';

const infuraId = process.env.INFURA_ID;
if (!infuraId) {
  console.error('Please export INFURA_ID=*** which is used for https://polygon-mainnet.infura.io/v3/***');
  process.exit();
}

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const RPC_HOST = `https://polygon-mainnet.infura.io/v3/${infuraId}`;

const getExchangeName = async function(poolId: number) {
  if (POOLS.depositPools.includes(poolId))
    return "";
  if (POOLS.activeVaults.includes(poolId))
    return "uni v3";
  return "sushi";
};

const getTradeUrl = function(poolId: number) {
  if (LABELS[poolId]['tradeUrl'])
    return LABELS[poolId]['tradeUrl'];
  return '';
}

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateFarm = async (tableName: string, poolId: number, 
    tokenPrices: {[name: string]: number}, 
    tokenNames: {[name: string]: string},
    knownIchiPerBlock: { [poolId: string]: string },
    farm_subgraph:GraphFarm | false ): Promise<APIGatewayProxyResult> => {

  let pool = await getPoolRecord(poolId, tokenPrices, knownIchiPerBlock, farm_subgraph);
  if (pool['pool'] == null) {
    // failed to get pool's data, not updating
    console.log("Can't get pool's data: "+poolId);
    return;
  }
  console.log(pool);

  let farmPoolId = 0;
  let farmName = '';
  let searchName = '';

  if (isFarmExternal(poolId)) {
    farmName = 'external';
  }
  if (isFarmGeneric(poolId)) {
    farmName = 'generic';
  }
  if (isFarmV2(poolId)) {
    farmName = 'V2'
  }
  farmPoolId = adjustedPid(poolId);

  let tokens = [];

  let token0 = {
    name: { S: pool['token0'].toLowerCase() },
    displayName: { S: tokenNames[pool['token0'].toLowerCase()] },
    isOneToken: { BOOL: TOKENS[pool['token0'].toLowerCase()]['isOneToken'] },
    price: { N: tokenPrices[pool['token0'].toLowerCase()].toString() },
    address: { S: pool['address0'] },
    reserve: { N: (Number(pool['reserve0Raw'])).toString() },
    decimals: { N: (Number(pool['decimals0'])).toString() }
  };
  tokens.push({ M: token0 });

  if (pool['token1'] == '') {
    searchName = farmName.toLowerCase()+'-'+pool['token0'].toLowerCase()+farmPoolId;
  } else {
    searchName = farmName.toLowerCase()+'-'+pool['token0'].toLowerCase()+'-'+pool['token1'].toLowerCase()+'-'+farmPoolId;

    let token1 = {
      name: { S: pool['token1'].toLowerCase() },
      displayName: { S: tokenNames[pool['token1'].toLowerCase()] },
      isOneToken: { BOOL: TOKENS[pool['token1'].toLowerCase()]['isOneToken'] },
      price: { N: tokenPrices[pool['token1'].toLowerCase()].toString() },
      address: { S: pool['address1'] },
      reserve: { N: (Number(pool['reserve1Raw'])).toString() },
      decimals: { N: (Number(pool['decimals1'])).toString() }
    };
    tokens.push({ M: token1 });
  }

  let isExternal = isFarmExternal(poolId);
  let isGeneric = isFarmGeneric(poolId);
  let isIchiPool = pool['token0'].toLowerCase() == 'pol_ichi' || pool['token1'].toLowerCase() == 'pol_ichi';
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
  if (pool['totalPoolLP'] && Number(pool['totalPoolLP']) > 0 &&
      pool['tvl'] && Number(pool['tvl']) > 0) {
        lpPrice = Number(pool['tvl']) * 10 ** 18 / Number(pool['totalPoolLP']);
        lpPrice = Math.round(lpPrice * 100) / 100;
  } else {
    if (isDeposit) {
      lpPrice = 1;
    }
  }

  let extras = {};
  if (LABELS[poolId]) {
    if (LABELS[poolId]['externalUrl']) {
      extras['externalUrl'] = { S: LABELS[poolId]['externalUrl'] }
    }
    if (LABELS[poolId]['externalText']) {
      extras['externalText'] = { S: LABELS[poolId]['externalText'] }
    }
    if (LABELS[poolId]['externalButton']) {
      extras['externalButton'] = { S: LABELS[poolId]['externalButton'] }
    }
  }
  const tradeUrl = getTradeUrl(poolId);
  if (tradeUrl != '') {
    extras['tradeUrl'] = { S: tradeUrl }
  }

  let farm = {};
  if (LABELS[poolId]) {
    if (isFarmV2Polygon(poolId)) {
      farm['farmAddress'] = { S: ADDRESSES.farming_V2 }
      farm['farmId'] = { N: adjustedPidString(poolId) }
      farm['farmRewardTokenName'] = { S: 'pol_ichi' }
      farm['farmRewardTokenDecimals'] = { N: '18' }
      farm['farmRewardTokenAddress'] = { S: TOKENS.pol_ichi.address }
    }
    if (LABELS[poolId]['farmAddress']) {
      farm['farmAddress'] = { S: LABELS[poolId]['farmAddress'] }
    }
    if (LABELS[poolId]['farmId'] != undefined) {
      farm['farmId'] = { N: Number(LABELS[poolId]['farmId']).toString() }
    }
    if (LABELS[poolId]['farmRewardTokenName']) {
      farm['farmRewardTokenName'] = { S: LABELS[poolId]['farmRewardTokenName'] }
    }
    if (LABELS[poolId]['farmRewardTokenDecimals']) {
      farm['farmRewardTokenDecimals'] = { N: Number(LABELS[poolId]['farmRewardTokenDecimals']).toString() }
    }
    if (LABELS[poolId]['farmRewardTokenAddress']) {
      farm['farmRewardTokenAddress'] = { S: LABELS[poolId]['farmRewardTokenAddress'] }
    }
  }

  // pool is retired if no rewards are given in it
  if (pool['yearlyAPY'] == 0)
    isRetired = true;

  // these pools may have 0 APY, but they are not retired
  if (isUnretired(poolId))
    isRetired = false; 

  let futureAPY = 0;
  let launchDate = 0;
  if (pool['futureAPY']) {
    const currentDate = Date.now();
    if (currentDate < LABELS[poolId]['launchDate']) {
      futureAPY = pool['futureAPY'];
      launchDate = LABELS[poolId]['launchDate'];
    }
  }
  
  let baseTokenTVL = Number(pool['tvl']);
  let vaultAPR = 0;
  let vaultIRR = 0;
  if (isVault) {
    let isHodl: boolean = LABELS[poolId].isHodl;
    let vaultName: string = LABELS[poolId].vaultName;
    let vaultAddress: string = LABELS[poolId].vaultAddress;
    let vaultEndpoint: string = LABELS[poolId].subgraphEndpoint;
    let dataPackets: DataPacket[] = [];
    let isInverted: boolean = LABELS[poolId].isInverted;
    let irrStartDate: Date = LABELS[poolId].irrStartDate;
    let irrStartTxAmount: number = LABELS[poolId].irrStartTxAmount;
    const decimals = VAULT_DECIMAL_TRACKER[vaultName];

    if (isHodl) {
      baseTokenTVL = Number(await getCurrentVaultValue(
        vaultAddress,
        isInverted,
        decimals.baseToken,
        decimals.scarceToken
      ));
    }

    if (POOLS.activeAPR.includes(poolId)) {

      let endOfDepositData = false;
      let depositPage = 1;
      while (!endOfDepositData) {
        let rawData: boolean | GraphData = await vault_graph_query(vaultEndpoint, depositPage, true, irrStartDate)
        if (rawData && rawData['data'] && rawData['data']['deposits']) {
          if (rawData.data['deposits'].length > 0) {
            dataPackets.push({ data: rawData, type: 'deposit' });
            depositPage++;
          }
          if (rawData.data['deposits'].length < 10) {
            endOfDepositData = true;
          }
        } else {
          endOfDepositData = true;
        }
      }

      let endOfWithdrawalData = false;
      let withdrawalPage = 1;
      while (!endOfWithdrawalData) {
        let rawData: boolean | GraphData = await vault_graph_query(vaultEndpoint, withdrawalPage, false, irrStartDate);
        if (rawData && rawData['data'] && rawData['data']['withdraws']) {
          if (rawData['data']['withdraws'].length > 0) {
            dataPackets.push({ data: rawData, type: 'withdrawal' })
            withdrawalPage++;
          }
          if (rawData['data']['withdraws'].length < 10) {
            endOfWithdrawalData = true;
          }
        } else {
          endOfWithdrawalData = true;
        }
      }

      if (dataPackets.length > 0) {      
        let vault = new Vault(vaultName, vaultAddress, vaultEndpoint, dataPackets, isInverted, irrStartDate)
      
        await vault.calcCurrentValue();
        await vault.getAPR();
        await vault.getIRR(irrStartDate, irrStartTxAmount);

        vaultAPR = vault.APR;
        vaultIRR = vault.IRR;
      }
    }
  }

  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03
  console.log(`Attempting to update table: ${tableName}, token: ${poolId}`);
  const params: AWS.DynamoDB.UpdateItemInput = {
    TableName: tableName,
    Key: {
      poolId: {
        N: Number(poolId).toString()
      }
    }, 
    UpdateExpression: 'set ' + 
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
      'futureAPY = :futureAPY, ' + 
      'launchDate = :launchDate, ' + 
      'isExternal = :isExternal, ' + 
      'isGeneric = :isGeneric, ' + 
      'isUpcoming = :isUpcoming, ' + 
      'isMigrating = :isMigrating, ' + 
      'isRetired = :isRetired, ' + 
      'isIchiPool = :isIchiPool, ' + 
      'isDeposit = :isDeposit, ' + 
      'isPosition = :isPosition, ' + 
      'chainId = :chainId, ' +
      'farmName = :farmName, ' +
      'vaultAPR = :vaultAPR, ' +
      'vaultIRR = :vaultIRR',
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
      ':futureAPY': { N: Number(futureAPY).toString() },
      ':launchDate': { N: Number(launchDate).toString() },
      ':isExternal': { BOOL: isExternal },
      ':isGeneric': { BOOL: isGeneric },
      ':isUpcoming': { BOOL: isUpcoming },
      ':isMigrating': { BOOL: isMigrating },
      ':isRetired': { BOOL: isRetired },
      ':isIchiPool': { BOOL: isIchiPool },
      ':isDeposit': { BOOL: isDeposit },
      ':isPosition': { BOOL: isVault },
      ':chainId': { N: Number(CHAIN_ID).toString() },
      ':farmName': { S: farmName },
      ':vaultAPR': { N: Number(vaultAPR).toString() },
      ':vaultIRR': { N: Number(vaultIRR).toString() }
    },
    ReturnValues: 'UPDATED_NEW'
  };

  try {
    // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html#API_UpdateItem_Examples
    const result = await dbClient.updateItem(params).promise();
    console.log(`Successfully updated table: ${tableName}`);
    console.log(JSON.stringify(result));
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

};
