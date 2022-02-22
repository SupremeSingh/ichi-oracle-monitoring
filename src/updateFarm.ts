import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ethers } from 'ethers';
import { ADDRESSES, POOLS, LABELS, CHAIN_ID, TOKENS } from './configMainnet';
import FARMING_V1_ABI from './abis/FARMING_V1_ABI.json';
import FARMING_V2_ABI from './abis/FARMING_V2_ABI.json';
import { getPoolRecord } from './getPoolRecord';
import * as pkg from '@apollo/client';
import { subgraph_query, Vault, dataPacket, graphData } from './subgraph';

const infuraId = process.env.INFURA_ID;
if (!infuraId) {
  console.error('Please export INFURA_ID=*** which is used for https://mainnet.infura.io/v3/***');
  process.exit();
}

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const RPC_HOST = `https://mainnet.infura.io/v3/${infuraId}`;

const getExchangeName = async function(poolId: number) {
  if (POOLS.depositPools.includes(poolId))
    return "";
  if (POOLS.bancorPools.includes(poolId))
    return "bancor";
  if (POOLS.dodoPools.includes(poolId))
    return "dodo";
  if (POOLS.rariAssets.includes(poolId))
    return "rari";
  if (POOLS.oneInchPools.includes(poolId))
    return "1inch";
  if (POOLS.uniPools.includes(poolId))
    return "uni v2";
  if (POOLS.activeVaults.includes(poolId))
    return "uni v3";
  if (POOLS.loopringPools.includes(poolId))
    return "loopring";
  if (POOLS.balancerPools.includes(poolId) || POOLS.balancerSmartPools.includes(poolId))
    return "balancer v1";
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
    knownIchiPerBlock: {[poolId: string]: string}): Promise<APIGatewayProxyResult> => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);

  const farming_V1 = new ethers.Contract(
    ADDRESSES.farming_V1,
    FARMING_V1_ABI,
    provider
  );
  const farming_V2 = new ethers.Contract(
    ADDRESSES.farming_V2,
    FARMING_V2_ABI,
    provider
  );

  let pool = await getPoolRecord(poolId, tokenPrices, knownIchiPerBlock);
  if (pool['pool'] == null) {
    // failed to get pool's data, not updating
    console.log("Can't get pool's data: "+poolId);
    return;
  }
  console.log(pool);

  let farmPoolId = 0;
  let farmName = '';
  let searchName = '';

  if (poolId >= 10000) {
    farmName = 'external';
    farmPoolId = poolId - 10000;
  }
  if (poolId >= 1000 && poolId < 10000) {
    farmName = 'V2'
    farmPoolId = poolId - 1000;
  }
  if (poolId < 1000) {
    farmName = 'V1'
    farmPoolId = poolId;
  }

  let tokens = [];

  if (pool['token0'] == '') {
    searchName = farmName.toLowerCase()+'-multi-'+farmPoolId;
  } else {
    let token0 = {
      name: { S: pool['token0'].toLowerCase() },
      displayName: { S: tokenNames[pool['token0'].toLowerCase()] },
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
        address: { S: pool['address1'] },
        reserve: { N: (Number(pool['reserve1Raw'])).toString() },
        decimals: { N: (Number(pool['decimals1'])).toString() }
      };
      tokens.push({ M: token1 });
    }
  }

  let isExternal = poolId >= 10000 && poolId < 20000;
  let isGeneric = poolId >= 20000;
  let isIchiPool = pool['token0'].toLowerCase() == 'ichi' || pool['token1'].toLowerCase() == 'ichi';
  isIchiPool = isIchiPool || poolId == 10004; // oneDODO-USDC to include into ICHI farms for now
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
    if (poolId >= 1000 && poolId < 5000) {
      farm['farmAddress'] = { S: ADDRESSES.farming_V2 }
      farm['farmId'] = { N: Number(poolId - 1000).toString() }
      farm['farmRewardTokenName'] = { S: 'ichi' }
      farm['farmRewardTokenDecimals'] = { N: '9' }
      farm['farmRewardTokenAddress'] = { S: TOKENS.ichi.address }
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
  if (poolId == 10001 || poolId == 20004 || poolId == 1001 || poolId == 1005 || poolId == 1011)
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
  
  let vaultAPR = 0
  let vaultIRR = 0
  if (isVault && POOLS.activeAPR.includes(poolId)) {

    let vaultName: string = LABELS[poolId].vaultName
    let vaultAddress: string = LABELS[poolId].vaultAddress
    let vaultEndpoint: string = LABELS[poolId].subgraphEndpoint
    let dataPackets: dataPacket[] = []
    let isInverted: boolean = LABELS[poolId].isInverted

    let endOfDepositData = false
    let depositPage = 1;
    while (!endOfDepositData) {
      let rawData: graphData = await subgraph_query(vaultEndpoint, depositPage, true)
      if (rawData['data'] && rawData['data']['deposits']) {
        if (rawData.data['deposits'].length > 0) {
          dataPackets.push({ data: rawData, type: 'deposit' })
          depositPage++
        }
        if (rawData.data['deposits'].length < 10) {
          endOfDepositData = true;
        }
      } else {
        endOfDepositData = true
      }
    }

    let endOfWithdrawalData = false
    let withdrawalPage = 1;
    while (!endOfWithdrawalData) {
      let rawData:graphData = await subgraph_query(vaultEndpoint, withdrawalPage, false)
      if (rawData['data'] && rawData['data']['withdraws']) {
        if (rawData['data']['withdraws'].length > 0) {
          dataPackets.push({ data: rawData, type: 'withdrawal' })
          withdrawalPage++
        }
        if (rawData['data']['withdraws'].length < 10) {
          endOfWithdrawalData = true;
        }
      } else {
        endOfWithdrawalData = true
      }
    }

    if (dataPackets.length > 0) {      
      let vault = new Vault(vaultName, vaultAddress, vaultEndpoint, dataPackets, isInverted)
    
      await vault.calcCurrentValue()
      await vault.getAPR()
      await vault.getIRR()

      vaultAPR = vault.APR
      vaultIRR = vault.IRR
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
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

};
