import { updateFarm } from './updateFarm';
import { POOLS } from './configMumbai';
import { APIGatewayProxyResult } from 'aws-lambda';

export const updateFarms = async (
  tableName: string,
  tokenPrices: { [name: string]: number },
  tokenNames: { [name: string]: string },
  knownIchiPerBlock: { [poolId: string]: string }
) => {
  for (let i = 0; i < POOLS.activePools.length; i++) {
    const res = await updateFarm(tableName, POOLS.activePools[i], tokenPrices, tokenNames, knownIchiPerBlock);
    console.log(`update ${POOLS.activePools[i]} results:`, res);
  }
  for (let i = 0; i < POOLS.activeVaults.length; i++) {
    const res = await updateFarm(tableName, POOLS.activeVaults[i], tokenPrices, tokenNames, knownIchiPerBlock);
    console.log(`update ${POOLS.activeVaults[i]} results:`, res);
  }
};

// Parallelized but may cause throttling issues
export const updateFarmsParallel = async (
  tableName: string,
  tokenPrices: { [name: string]: number },
  tokenNames: { [name: string]: string },
  knownIchiPerBlock: { [poolId: string]: string }
) => {
  const poolPromises: Promise<APIGatewayProxyResult>[] = [];
  for (let poolId of POOLS.activePools) {
    poolPromises.push(updateFarm(tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock));
  }

  const vaultPromises: Promise<APIGatewayProxyResult>[] = [];
  for (let vaultId of POOLS.activeVaults) {
    vaultPromises.push(updateFarm(tableName, vaultId, tokenPrices, tokenNames, knownIchiPerBlock));
  }

  const poolResults = await Promise.all(poolPromises);
  console.log(`Finished updating pools`, poolResults);

  const vaultResults = await Promise.all(vaultPromises);
  console.log(`Finished updating vaults`, vaultResults);
};
