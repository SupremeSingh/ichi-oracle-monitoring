import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { dbClient } from './configMainnet';
import { getPoolRecord as getPoolRecordMainnet } from './getPoolRecord';
import { getPoolRecord as getPoolRecordPolygon } from './polygon/getPoolRecord';
import { GraphData } from './subgraph/model';
import { GraphFarm } from './subgraph/farm_v2';
import { vaultGraphQuery, Vault, DataPacket, getCurrentVaultValue, getVaultPoolAddress } from './subgraph/ichi_vaults';
import {
  AddressName,
  ChainId,
  getAddress,
  getPoolLabel,
  getProvider,
  getToken,
  Pools,
  TokenName,
  adjustedPid,
  adjustedPidString,
  isFarmExternal,
  isFarmGeneric,
  isFarmV1,
  isFarmV2,
  isUnretired,
  VaultName,
  getVault,
  getExchangeName,
  isFarmV2Polygon,
  PartialRecord,
  MainnetPoolNumbers,
  PolygonPoolNumbers,
  isOneToken
} from '@ichidao/ichi-sdk';

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateFarm = async (
  tableName: string,
  poolId: MainnetPoolNumbers | PolygonPoolNumbers,
  tokenPrices: PartialRecord<TokenName, number>,
  tokenNames: PartialRecord<TokenName, string>,
  knownIchiPerBlock: PartialRecord<MainnetPoolNumbers | PolygonPoolNumbers, number>,
  farmSubgraph: GraphFarm | false,
  dubVault: any | false,
  chainId: ChainId
): Promise<APIGatewayProxyResult> => {
  const provider = await getProvider(chainId);
  let pool =
    chainId === ChainId.Mainnet
      ? await getPoolRecordMainnet(poolId as MainnetPoolNumbers, tokenPrices, knownIchiPerBlock, farmSubgraph, chainId)
      : await getPoolRecordPolygon(poolId as PolygonPoolNumbers, tokenPrices, knownIchiPerBlock, farmSubgraph, chainId);
  if (pool.pool == null) {
    // failed to get pool's data, not updating
    console.log(`Can't get pool's data: ${poolId}`);
    return;
  }
  const poolLabel = getPoolLabel(poolId, chainId);
  console.log('pool', pool);
  console.log('poolLabel', poolLabel);

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
    farmName = 'V2';
  }
  if (isFarmV1(poolId)) {
    farmName = 'V1';
  }
  farmPoolId = adjustedPid(poolId);

  const isLegacy = Pools.LEGACY_POOLS[chainId]?.includes(poolId);

  let tokens = [];

  // There is overlapping logic between mainnet and polygon but that's for another day to untangle
  if (chainId === ChainId.Mainnet) {
    if (pool.token0 == '') {
      searchName = farmName.toLowerCase() + '-multi-' + farmPoolId;
    } else {
      let token0 = {
        name: { S: pool.token0.toLowerCase() },
        displayName: { S: tokenNames[pool.token0.toLowerCase()] },
        isOneToken: { BOOL: isOneToken(pool.token0, chainId) },
        price: { N: tokenPrices[pool.token0.toLowerCase()].toString() },
        address: { S: pool.address0 },
        reserve: { N: Number(pool.reserve0Raw).toString() },
        decimals: { N: Number(pool.decimals0).toString() }
      };
      tokens.push({ M: token0 });

      if (pool.token1 == '') {
        searchName = farmName.toLowerCase() + '-' + pool.token0.toLowerCase() + farmPoolId;
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
  } else if (chainId === ChainId.Polygon) {
    let token0 = {
      name: { S: pool.token0.toLowerCase() },
      displayName: { S: tokenNames[pool.token0.toLowerCase()] },
      // TODO: I really don't like the below, it's fragile to cast like this
      isOneToken: { BOOL: isOneToken(pool.token0, chainId) },
      price: { N: tokenPrices[pool.token0.toLowerCase()].toString() },
      address: { S: pool.address0 },
      reserve: { N: Number(pool.reserve0Raw).toString() },
      decimals: { N: Number(pool.decimals0).toString() }
    };
    tokens.push({ M: token0 });

    if (pool.token1 == '') {
      searchName = farmName.toLowerCase() + '-' + pool.token0.toLowerCase() + farmPoolId;
    } else {
      searchName =
        farmName.toLowerCase() + '-' + pool.token0.toLowerCase() + '-' + pool.token1.toLowerCase() + '-' + farmPoolId;

      let token1 = {
        name: { S: pool.token1.toLowerCase() },
        displayName: { S: tokenNames[pool.token1.toLowerCase()] },
        // TODO: I really don't like the below, it's fragile to cast like this
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
  let isIchiPool = false;
  if (chainId === ChainId.Mainnet) {
    isIchiPool =
      pool.token0.toLowerCase() == TokenName.ICHI ||
      pool.token1.toLowerCase() == TokenName.ICHI ||
      pool.token0.toLowerCase() == TokenName.ICHI_V2 ||
      pool.token1.toLowerCase() == TokenName.ICHI_V2;
    isIchiPool = isIchiPool || poolId == MainnetPoolNumbers.ONE_DODO_USDC_MAINNET; // oneDODO-USDC to include into ICHI farms for now
  } else if (chainId === ChainId.Polygon) {
    // TODO: Keeping the pol_ for legacy reasons until I know we can delete it
    isIchiPool =
      [TokenName.ICHI, `pol_${TokenName.ICHI}`].includes(pool.token0.toLowerCase()) ||
      [TokenName.ICHI, `pol_${TokenName.ICHI}`].includes(pool.token1.toLowerCase());
  }
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
  if (pool.totalPoolLP && Number(pool.totalPoolLP) > 0 && pool.tvl && Number(pool.tvl) > 0) {
    lpPrice = (Number(pool.tvl) * 10 ** 18) / Number(pool.totalPoolLP);
    lpPrice = Math.round(lpPrice * 100) / 100;
  } else {
    if (isDeposit) {
      lpPrice = 1;
    }
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
  const tradeUrl = poolLabel.tradeUrl || '';
  if (tradeUrl != '') {
    extras['tradeUrl'] = { S: tradeUrl };
  }

  let farm = {};
  if (poolLabel) {
    if (isFarmV2(poolId)) {
      farm['farmAddress'] = { S: getAddress(AddressName.FARMING_V2, chainId) };
      farm['farmId'] = { N: adjustedPidString(poolId) };
      farm['farmRewardTokenName'] = { S: 'ichi' };
      farm['farmRewardTokenDecimals'] = { N: '9' };
      farm['farmRewardTokenAddress'] = { S: getToken(TokenName.ICHI, chainId).address };
    } else if (isFarmV2Polygon(poolId)) {
      farm['farmAddress'] = { S: getAddress(AddressName.FARMING_V2, chainId) };
      farm['farmId'] = { N: adjustedPidString(poolId) };
      // farm['farmRewardTokenName'] = { S: 'pol_ichi' };
      // TODO: Logic change, removed the pol_
      farm['farmRewardTokenName'] = { S: TokenName.ICHI };
      farm['farmRewardTokenDecimals'] = { N: '18' };
      // TODO: Logic change
      // TOKENS.pol_ichi.address
      farm['farmRewardTokenAddress'] = { S: getToken(TokenName.ICHI_V2, chainId).address };
    }
    if (poolLabel.farmAddress) {
      farm['farmAddress'] = { S: poolLabel.farmAddress };
    }
    if (poolLabel.farmId != undefined) {
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
  if (pool.yearlyAPY == 0) isRetired = true;

  // these pools may have 0 APY, but they are not retired
  if (isUnretired(poolId)) isRetired = false;

  let futureAPY = 0;
  let launchDate = 0;
  if (pool.futureAPY) {
    const currentDate = Date.now();
    if (currentDate < poolLabel.launchDate) {
      futureAPY = pool.futureAPY;
      launchDate = poolLabel.launchDate;
    }
  }

  let baseTokenTVL = Number(pool.tvl);
  pool.poolAddress = '';
  let vaultAPR = 0;
  let vaultIRR = 0;
  if (dubVault) {
    baseTokenTVL = Number(dubVault['Attributes']['baseTokenTVL']['N']);
    vaultAPR = Number(dubVault['Attributes']['vaultAPR']['N']);
    vaultIRR = Number(dubVault['Attributes']['vaultIRR']['N']);
  } else if (isVault) {
    let isHodl = poolLabel.isHodl;
    let vaultName = poolLabel.vaultName;
    let vaultAddress = poolLabel.vaultAddress;
    let vaultEndpoint = poolLabel.subgraphEndpoint;
    let dataPackets: DataPacket[] = [];
    let isInverted = poolLabel.isInverted;
    let irrStartDate = poolLabel.irrStartDate;
    let irrStartTxAmount = poolLabel.irrStartTxAmount;
    // const decimals = VAULT_DECIMAL_TRACKER[vaultName];

    pool.poolAddress = (await getVaultPoolAddress(vaultAddress, provider)).toString();

    if (isHodl) {
      const vault = getVault(vaultName as VaultName, chainId);
      baseTokenTVL = Number(
        await getCurrentVaultValue(
          vaultAddress,
          isInverted,
          vault.baseTokenDecimals,
          vault.scarceTokenDecimals,
          provider
        )
      );
    }

    if (Pools.ACTIVE_APR[chainId].includes(poolId)) {
      let endOfDepositData = false;
      let depositPage = 1;
      while (!endOfDepositData) {
        let rawData: boolean | GraphData = await vaultGraphQuery(
          depositPage,
          true,
          irrStartDate,
          vaultAddress,
          chainId === ChainId.Mainnet ? 'mainnet' : 'polygon'
        );
        if (rawData && rawData['data'] && rawData['data']['vaultDeposits']) {
          if (rawData.data['vaultDeposits'].length > 0) {
            dataPackets.push({ data: rawData, type: 'deposit' });
            depositPage++;
          }
          if (rawData.data['vaultDeposits'].length < 1000) {
            endOfDepositData = true;
          }
        } else {
          endOfDepositData = true;
        }
      }

      let endOfWithdrawalData = false;
      let withdrawalPage = 1;
      while (!endOfWithdrawalData) {
        let rawData: boolean | GraphData = await vaultGraphQuery(
          withdrawalPage,
          false,
          irrStartDate,
          vaultAddress,
          chainId === ChainId.Mainnet ? 'mainnet' : 'polygon'
        );
        if (rawData && rawData['data'] && rawData['data']['vaultWithdraws']) {
          if (rawData['data']['vaultWithdraws'].length > 0) {
            dataPackets.push({ data: rawData, type: 'withdrawal' });
            withdrawalPage++;
          }
          if (rawData['data']['vaultWithdraws'].length < 1000) {
            endOfWithdrawalData = true;
          }
        } else {
          endOfWithdrawalData = true;
        }
      }

      if (dataPackets.length > 0) {
        let vault = new Vault(vaultName, vaultAddress, vaultEndpoint, dataPackets, isInverted, irrStartDate, provider);

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
    UpdateExpression:
      'set ' +
      'farmPoolId = :farmPoolId, ' +
      'searchName = :searchName, ' +
      'displayName = :displayName, ' +
      'lpName = :lpName, ' +
      'lpAddress = :lpAddress, ' +
      'lpPrice = :lpPrice, ' +
      'poolAddress = :poolAddress, ' +
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
      'isLegacy = :isLegacy, ' +
      'chainId = :chainId, ' +
      'farmName = :farmName, ' +
      'vaultAPR = :vaultAPR, ' +
      'vaultIRR = :vaultIRR',
    ExpressionAttributeValues: {
      ':farmPoolId': { N: Number(farmPoolId).toString() },
      ':searchName': { S: searchName },
      ':displayName': { S: displayName },
      ':lpName': { S: lpName },
      ':lpAddress': { S: pool.lpAddress },
      ':lpPrice': { N: Number(lpPrice).toString() },
      ':poolAddress': { S: pool.poolAddress },
      ':extras': { M: extras },
      ':farm': { M: farm },
      ':shortLpName': { S: shortLpName },
      ':tokens': { L: tokens },
      ':exchange': { S: exchange },
      ':tvl': { N: Number(pool.tvl).toString() },
      ':baseTokenTVL': { N: Number(baseTokenTVL).toString() },
      ':farmTVL': { N: Number(pool.farmTVL).toString() },
      ':totalPoolLP': { S: pool.totalPoolLP },
      ':totalFarmLP': { S: pool.totalFarmLP },
      ':dailyAPY': { N: Number(pool.dailyAPY).toString() },
      ':weeklyAPY': { N: Number(pool.weeklyAPY).toString() },
      ':monthlyAPY': { N: Number(pool.monthlyAPY).toString() },
      ':yearlyAPY': { N: Number(pool.yearlyAPY).toString() },
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
      ':isLegacy': { BOOL: isLegacy },
      ':chainId': { N: chainId.toString() },
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
    console.error(`Error updating ${tableName}, params:\n${JSON.stringify(params, null, ' ')}`);
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }
};
