import { updateFarm } from './updateFarm';
import { getSubgraphPoolRecords, GraphFarm } from './subgraph/farm_v2';
import { APIGatewayProxyResult } from 'aws-lambda';
import {
  adjustedPid,
  ChainId,
  isFarmV2,
  MainnetPoolNumbers,
  PartialRecord,
  PolygonPoolNumbers,
  Pools,
  TokenName
} from '@ichidao/ichi-sdk';

export const updateFarms = async (
  tableName: string,
  tokenPrices: PartialRecord<TokenName, number>,
  tokenNames: PartialRecord<TokenName, string>,
  knownIchiPerBlock: PartialRecord<MainnetPoolNumbers | PolygonPoolNumbers, number>,
  chainId: ChainId
): Promise<void> => {
  let graphFarm = await getSubgraphPoolRecords();
  let specificGraphFarm: GraphFarm | false;

  const promises: Promise<APIGatewayProxyResult>[] = [];

  for (const poolId of Pools.ACTIVE_POOLS[chainId]) {
    if (graphFarm && isFarmV2(poolId)) {
      specificGraphFarm = graphFarm.get(adjustedPid(poolId));
    } else {
      specificGraphFarm = false;
    }
    promises.push(
      updateFarm(tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, specificGraphFarm, false, chainId)
    );
  }

  let oneUniVaultObj = false;
  if (Pools.ACTIVE_VAULTS[chainId].includes(MainnetPoolNumbers.ONE_UNI_VAULT_LP)) {
    if (graphFarm) {
      specificGraphFarm = graphFarm.get(adjustedPid(MainnetPoolNumbers.ONE_UNI_VAULT_LP));
    } else {
      specificGraphFarm = false;
    }
    const oneUniVault = await updateFarm(
      tableName,
      MainnetPoolNumbers.ONE_UNI_VAULT_LP,
      tokenPrices,
      tokenNames,
      knownIchiPerBlock,
      specificGraphFarm,
      false,
      chainId
    );
    oneUniVaultObj = JSON.parse(oneUniVault.body);
  }

  for (const vaultId of Pools.ACTIVE_VAULTS[chainId]) {
    if (vaultId == MainnetPoolNumbers.ONE_UNI_VAULT_LP) continue;

    if (graphFarm && isFarmV2(vaultId)) {
      specificGraphFarm = graphFarm.get(adjustedPid(vaultId));
    } else {
      specificGraphFarm = false;
    }

    if (vaultId == MainnetPoolNumbers.ONE_UNI_VAULT) {
      promises.push(
        updateFarm(
          tableName,
          vaultId,
          tokenPrices,
          tokenNames,
          knownIchiPerBlock,
          specificGraphFarm,
          oneUniVaultObj,
          chainId
        )
      );
    } else {
      promises.push(
        updateFarm(tableName, vaultId, tokenPrices, tokenNames, knownIchiPerBlock, specificGraphFarm, false, chainId)
      );
    }
  }
};
