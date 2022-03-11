import { updateFarm } from './updateFarm';
import { POOLS } from './configPolygon';
import { adjustedPid, isFarmV2 } from '../utils/pids';
import {getSubgraphPoolRecords, GraphFarm} from '../subgraph'
export const updateFarms = async (tableName: string, 
    tokenPrices: {[name: string]: number}, 
    tokenNames: {[name: string]: string},
  knownIchiPerBlock: { [poolId: string]: string }) => {
  let graph_farm = (await getSubgraphPoolRecords());
  let specific_graph_farm: GraphFarm | false;
  for (let i = 0; i < POOLS.activePools.length; i++) {
    if (graph_farm && isFarmV2(POOLS.activePools[i])) {
      specific_graph_farm = graph_farm.get(adjustedPid(POOLS.activePools[i]));
    } else {
      specific_graph_farm = false;
    }
    let res = await updateFarm(tableName, POOLS.activePools[i], tokenPrices, tokenNames, knownIchiPerBlock, specific_graph_farm);

    console.log("update " + POOLS.activePools[i] + " results:");
    console.log(res);
  }
  for (let i = 0; i < POOLS.activeVaults.length; i++) {
    if (graph_farm && isFarmV2(POOLS.activeVaults[i])) {
      specific_graph_farm = graph_farm.get(adjustedPid(POOLS.activeVaults[i]));
    } else {
      specific_graph_farm = false;
    }
    let res = await updateFarm(tableName, POOLS.activeVaults[i], tokenPrices, tokenNames, knownIchiPerBlock, specific_graph_farm);

    console.log("update " + POOLS.activeVaults[i] + " results:");
    console.log(res);
  }
};
