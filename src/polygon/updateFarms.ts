import { getSubgraphPoolRecords, GraphFarm } from '../subgraph/farm_v2';
import { APIGatewayProxyResult } from 'aws-lambda';
import { adjustedPid, ChainId, isFarmV2, Pools } from '@ichidao/ichi-sdk';
import { updateFarm } from '../updateFarm';

export const updateFarms = async (
  tableName: string,
  tokenPrices: { [name: string]: number },
  tokenNames: { [name: string]: string },
  knownIchiPerBlock: { [poolId: string]: string },
  chainId: ChainId
) => {
  let graph_farm = await getSubgraphPoolRecords();
  let specific_graph_farm: GraphFarm | false;

  const promises: Promise<APIGatewayProxyResult>[] = [];

  for (let poolId of Pools.ACTIVE_POOLS[chainId]) {
    if (graph_farm && isFarmV2(poolId)) {
      specific_graph_farm = graph_farm.get(adjustedPid(poolId));
    } else {
      specific_graph_farm = false;
    }
    promises.push(
      updateFarm(tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, specific_graph_farm, false, chainId)
    );
  }

  for (let vaultId of Pools.ACTIVE_VAULTS[chainId]) {
    if (graph_farm && isFarmV2(vaultId)) {
      specific_graph_farm = graph_farm.get(adjustedPid(vaultId));
    } else {
      specific_graph_farm = false;
    }
    promises.push(
      updateFarm(tableName, vaultId, tokenPrices, tokenNames, knownIchiPerBlock, specific_graph_farm, false, chainId)
    );
  }
};
