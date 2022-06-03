import { updateFarm } from './updateFarm';
import { POOLS } from './configPolygon';
import { adjustedPid, isFarmV2 } from '../utils/pids';
import { getSubgraphPoolRecords, GraphFarm } from '../subgraph/farm_v2';
import { APIGatewayProxyResult } from 'aws-lambda';

export const updateFarms = async (
  tableName: string,
  tokenPrices: { [name: string]: number },
  tokenNames: { [name: string]: string },
  knownIchiPerBlock: { [poolId: string]: string }
) => {
  let graph_farm = await getSubgraphPoolRecords();
  let specific_graph_farm: GraphFarm | false;

  const promises: Promise<APIGatewayProxyResult>[] = [];

  for (let poolId of POOLS.activePools) {
    if (graph_farm && isFarmV2(poolId)) {
      specific_graph_farm = graph_farm.get(adjustedPid(poolId));
    } else {
      specific_graph_farm = false;
    }
    promises.push(updateFarm(tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, specific_graph_farm));
  }

  for (let vaultId of POOLS.activeVaults) {
    if (graph_farm && isFarmV2(vaultId)) {
      specific_graph_farm = graph_farm.get(adjustedPid(vaultId));
    } else {
      specific_graph_farm = false;
    }
    promises.push(updateFarm(tableName, vaultId, tokenPrices, tokenNames, knownIchiPerBlock, specific_graph_farm));
  }
};
