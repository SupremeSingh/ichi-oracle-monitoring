import { updateFarm } from './updateFarm';
import { POOLS } from './configKovan';
import { APIGatewayProxyResult } from 'aws-lambda';

export const updateFarms = async (
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

  const farmResults = await Promise.all(poolPromises);
  console.log(`Finished updating farms`, farmResults);

  const vaultResults = await Promise.all(poolPromises);
  console.log(`Finished updating vaults`, vaultResults);
};
