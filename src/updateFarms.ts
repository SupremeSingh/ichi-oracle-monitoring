import { updateFarm } from './updateFarm';
import { POOLS } from './configMainnet';

export const updateFarms = async (tableName: string, tokenPrices: {[name: number]: string}, 
    tokenNames: {[name: string]: string}) => {
  for (let i = 0; i < POOLS.activePools.length; i++) {
    let res = await updateFarm(tableName, POOLS.activePools[i], tokenPrices, tokenNames);

    console.log("update " + POOLS.activePools[i] + " results:");
    console.log(res);
  }
};
