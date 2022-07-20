import { updateFarm } from './updateFarm';
import { APIGatewayProxyResult } from 'aws-lambda';
import { ChainId, PartialRecord, KovanPoolNumbers, Pools, TokenName } from '@ichidao/ichi-sdk';

export const updateFarms = async (
  tableName: string,
  tokenPrices: PartialRecord<TokenName, number>,
  tokenNames: PartialRecord<TokenName, string>,
  knownIchiPerBlock: PartialRecord<KovanPoolNumbers, number>,
  chainId: ChainId
) => {
  for (const poolId of Pools.ACTIVE_POOLS[chainId]) {
    const res = await updateFarm(tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, chainId);
    console.log(`update ${poolId} results:`, res);
  }
  for (const poolId of Pools.ACTIVE_VAULTS[chainId]) {
    const res = await updateFarm(tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, chainId);
    console.log(`update ${poolId} results:`, res);
  }
};

export const updateFarmsParallel = async (
  tableName: string,
  tokenPrices: PartialRecord<TokenName, number>,
  tokenNames: PartialRecord<TokenName, string>,
  knownIchiPerBlock: PartialRecord<KovanPoolNumbers, number>,
  chainId: ChainId
) => {
  const poolPromises: Promise<APIGatewayProxyResult>[] = [];
  for (const poolId of Pools.ACTIVE_POOLS[chainId]) {
    poolPromises.push(updateFarm(tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, chainId));
  }

  const vaultPromises: Promise<APIGatewayProxyResult>[] = [];
  for (const poolId of Pools.ACTIVE_VAULTS[chainId]) {
    vaultPromises.push(updateFarm(tableName, poolId, tokenPrices, tokenNames, knownIchiPerBlock, chainId));
  }

  const farmResults = await Promise.all(poolPromises);
  console.log(`Finished updating farms`, farmResults);

  const vaultResults = await Promise.all(poolPromises);
  console.log(`Finished updating vaults`, vaultResults);
};
