import { updateFarm } from './updateFarm';
import { POOLS } from './configKovan';

export const updateFarms = async (tableName: string, 
    tokenPrices: {[name: string]: number}, 
    tokenNames: {[name: string]: string},
    knownIchiPerBlock: {[poolId: string]: string}) => {
  for (let i = 0; i < POOLS.activePools.length; i++) {
    let res = await updateFarm(tableName, POOLS.activePools[i], tokenPrices, tokenNames, knownIchiPerBlock);

    console.log("update " + POOLS.activePools[i] + " results:");
    console.log(res);
  }
};
