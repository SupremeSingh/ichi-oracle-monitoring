import { updateFarm } from './updateFarm';
import { POOLS } from './configMumbai';

export const updateFarms = async (tableName: string, 
    tokenPrices: {[name: string]: number}, 
    tokenNames: {[name: string]: string},
    knownIchiPerBlock: {[poolId: string]: string}) => {
  for (let i = 0; i < POOLS.activePools.length; i++) {
    let res = await updateFarm(tableName, POOLS.activePools[i], tokenPrices, tokenNames, knownIchiPerBlock);

    console.log("update " + POOLS.activePools[i] + " results:");
    console.log(res);
  }
  for (let i = 0; i < POOLS.activeVaults.length; i++) {
    let res = await updateFarm(tableName, POOLS.activeVaults[i], tokenPrices, tokenNames, knownIchiPerBlock);

    console.log("update " + POOLS.activeVaults[i] + " results:");
    console.log(res);
  }
};
