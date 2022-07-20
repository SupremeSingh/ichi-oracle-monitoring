import {
  AddressName,
  adjustedPid,
  ChainId,
  getAddress,
  getPoolLabel,
  getPoolReserves,
  getPoolTokens,
  getProvider,
  getTokenData,
  isFarmGeneric,
  PoolRecord,
  Pools,
  PartialRecord,
  TokenName,
  getFarmingV2Contract,
  getGenericFarmingV2Contract,
  FarmingContracts,
  asGenericFarmingV2,
  getTotalSupply,
  Contracts,
  getIchiVaultContract,
  getGenericPoolContract,
  asFarmingV2,
  getBlocksPerDay,
  KovanPoolNumbers
} from '@ichidao/ichi-sdk';

async function getPoolContract(
  poolID: number,
  farm: FarmingContracts,
  adjusterPoolId: number,
  chainId: ChainId
): Promise<Contracts> {
  const provider = await getProvider(chainId);
  let isVault = Pools.ACTIVE_VAULTS[chainId].includes(poolID);
  let poolToken = await asFarmingV2(farm).lpToken(adjusterPoolId);

  if (isVault) {
    const poolContract = getIchiVaultContract(poolToken, provider);
    return poolContract;
  } else {
    const poolContract = getGenericPoolContract(poolToken, provider);
    return poolContract;
  }
}

export async function getPoolRecord(
  poolId: KovanPoolNumbers,
  tokenPrices: PartialRecord<TokenName, number>,
  _knownIchiPerBlock: PartialRecord<KovanPoolNumbers, number>,
  chainId: ChainId
) {
  let adjustedPoolId = adjustedPid(poolId);

  const provider = await getProvider(chainId);
  const farming_V2 = getFarmingV2Contract(
    getAddress(AddressName.FARMING_V2, chainId),
    provider
  ) as FarmingContracts;
  const poolLabel = getPoolLabel(poolId, chainId);

  let farm = farming_V2;
  if (isFarmGeneric(poolId)) {
    farm = getGenericFarmingV2Contract(poolLabel.farmAddress, provider);
    adjustedPoolId = poolLabel.farmId;
  }

  let poolToken = await asFarmingV2(farm).lpToken(adjustedPoolId);

  // getting data for an active pool (or inactive pool not cached yet)
  let reward = 0;
  let bonusToRealRatio = 1;
  let inTheFarmLP = '';
  let rewardTokenDecimals = 9;
  // TODO: Logic change
  let rewardTokenName = TokenName.ICHI; // 'test_ichi';

  let rewardsPerBlock = 0;
  if (isFarmGeneric(poolId)) {
    let res = await asGenericFarmingV2(farm).rewardTokensPerBlock();
    rewardsPerBlock = Number(res);
    rewardTokenDecimals = poolLabel.farmRewardTokenDecimals;
    rewardTokenName = poolLabel.farmRewardTokenName.toLowerCase() as TokenName;
  } else {
    let ichiPerBlock_V2 = await asFarmingV2(farm).ichiPerBlock();
    rewardsPerBlock = Number(ichiPerBlock_V2);
  }

  let totalAllocPoint = Number(await farm.totalAllocPoint());
  let poolInfo = await asFarmingV2(farm).poolInfo(adjustedPoolId);
  let poolAllocPoint = Number(poolInfo.allocPoint);

  reward = (rewardsPerBlock * poolAllocPoint) / totalAllocPoint;
  inTheFarmLP = (await farm.getLPSupply(adjustedPoolId)).toString();

  const poolContract = await getPoolContract(adjustedPoolId, farm, adjustedPoolId, chainId);

  // common calls
  reward = Number(reward) / 10 ** rewardTokenDecimals;
  reward = reward * bonusToRealRatio;

  let totalPoolLP = await getTotalSupply(poolContract);

  let farmRatio = 0;
  if (Number(totalPoolLP) !== 0) {
    farmRatio = Number(inTheFarmLP) / Number(totalPoolLP);
  }

  let isDeposit = Pools.DEPOSIT_POOLS[chainId].includes(poolId);

  let token0 = '';
  let token1 = '';
  let token0Symbol = '';
  let token1Symbol = '';
  let token0Decimals = 0;
  let token1Decimals = 0;
  let reserve0Raw = 0;
  let reserve1Raw = 0;
  let localTVL = 0;

  if (isDeposit) {
    token0 = poolToken;

    let token0data = await getTokenData(token0, chainId);

    token0Symbol = token0data.symbol;
    token0Decimals = token0data.decimals;

    reserve0Raw = Number(totalPoolLP) / 10 ** token0Decimals;
    localTVL = reserve0Raw;
  } else {
    let tokens = await getPoolTokens(poolContract, chainId);
    token0 = tokens.token0;
    token1 = tokens.token1;

    let token0data = await getTokenData(token0, chainId);
    let token1data = await getTokenData(token1, chainId);

    token0Symbol = token0data.symbol;
    token0Decimals = token0data.decimals;
    token1Symbol = token1data.symbol;
    token1Decimals = token1data.decimals;

    let reserve = await getPoolReserves(poolContract, chainId);

    let reserve0 = reserve._reserve0;
    let reserve1 = reserve._reserve1;
    reserve0Raw = reserve0 / 10 ** token0Decimals;
    reserve1Raw = reserve1 / 10 ** token1Decimals;

    token0 = token0 === getAddress(AddressName.ETH, chainId) ? tokens[TokenName.WETH].address : token0;
    token1 = token1 === getAddress(AddressName.ETH, chainId) ? tokens[TokenName.WETH].address : token1;

    let prices = {};
    prices[token0] = tokenPrices[token0Symbol.toLowerCase()];
    prices[token1] = tokenPrices[token1Symbol.toLowerCase()];

    if (prices[token0] && prices[token1]) {
      localTVL = reserve0Raw * prices[token0] + reserve1Raw * prices[token1];
    } else {
      if (prices[token0]) {
        localTVL = 2 * reserve0Raw * prices[token0];
      } else if (prices[token1]) {
        localTVL = 2 * reserve1Raw * prices[token1];
      } else {
        console.log('==== error ====');
        // hardcoded prices for testing on Kovan
        /*if (token0.toLowerCase() === configKovan.WEENUS.toLowerCase()) {
          localTVL = 2 * reserve0Raw * 10000;
        }
        if (token0.toLowerCase() === configKovan.TEST_ICHI.toLowerCase()) {
          localTVL = 2 * reserve0Raw * 13;
        }*/
      }
    }
  }

  let apyTVL = Number(localTVL) * farmRatio;

  let dailyAPY = 0;
  if (apyTVL !== 0) {
    let ichiReturnUsd = (getBlocksPerDay(chainId) * reward * tokenPrices[rewardTokenName]) / apyTVL;
    dailyAPY = ichiReturnUsd * 100;
  }

  const poolRecord: PoolRecord = {
    pool: poolId,
    lpAddress: poolToken,
    dailyAPY: dailyAPY,
    weeklyAPY: dailyAPY * 7,
    monthlyAPY: dailyAPY * 30,
    yearlyAPY: dailyAPY * 365,
    totalPoolLP: totalPoolLP,
    totalFarmLP: inTheFarmLP.toString(),
    tvl: localTVL,
    farmTVL: apyTVL,
    reserve0Raw: reserve0Raw,
    reserve1Raw: reserve1Raw,
    address0: token0,
    address1: token1,
    decimals0: token0Decimals,
    decimals1: token1Decimals,
    token0: token0Symbol,
    token1: token1Symbol
  };

  return poolRecord;
}
