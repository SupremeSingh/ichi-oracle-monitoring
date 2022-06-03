import { updateFarm } from './updateFarm';
import { POOLS } from './configMainnet';
import { adjustedPid, isFarmV2 } from './utils/pids';
import { getSubgraphPoolRecords, GraphFarm } from './subgraph/farm_v2';
import { APIGatewayProxyResult } from 'aws-lambda';

export const updateFarms = async (
  tableName: string,
  tokenPrices: { [name: string]: number },
  tokenNames: { [name: string]: string },
  knownIchiPerBlock: { [poolId: string]: string }
): Promise<void> => {
  let graph_farm = await getSubgraphPoolRecords();
  let specific_graph_farm: GraphFarm | false;

  const promises: Promise<APIGatewayProxyResult>[] = [];

  for (let poolId of POOLS.activePools) {
    if (graph_farm && isFarmV2(poolId)) {
      specific_graph_farm = graph_farm.get(adjustedPid(poolId));
    } else {
      specific_graph_farm = false;
    }
    promises.push(
      updateFarm(tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, specific_graph_farm, false)
    );
  }

  let oneUni_vault_obj = false;
  if (POOLS.activeVaults.includes(1016)) {
    if (graph_farm) specific_graph_farm = graph_farm.get(adjustedPid(1016));
    else specific_graph_farm = false;
    const oneUni_vault = await updateFarm(
      tableName,
      1016,
      tokenPrices,
      tokenNames,
      knownIchiPerBlock,
      specific_graph_farm,
      false
    );
    oneUni_vault_obj = JSON.parse(oneUni_vault.body);
  }

  for (let vaultId of POOLS.activeVaults) {
    if (vaultId == 1016) continue;

    if (graph_farm && isFarmV2(vaultId)) {
      specific_graph_farm = graph_farm.get(adjustedPid(vaultId));
    } else {
      specific_graph_farm = false;
    }

    if (vaultId == 10006) {
      promises.push(
        updateFarm(
          tableName,
          vaultId,
          tokenPrices,
          tokenNames,
          knownIchiPerBlock,
          specific_graph_farm,
          oneUni_vault_obj
        )
      );
    } else {
      promises.push(
        updateFarm(tableName, vaultId, tokenPrices, tokenNames, knownIchiPerBlock, specific_graph_farm, false)
      );
    }
  }
};
