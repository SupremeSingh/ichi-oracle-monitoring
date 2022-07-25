import { BigNumber } from 'ethers';
import { GraphFarm } from '../subgraph/farm_v2';
import {
  ChainId,
  getProvider,
  Optional,
  PoolRecord,
  adjustedPid,
  isFarmExternal,
  AddressName,
  getAddress,
  Pools,
  getTokens,
  getPoolTokens,
  Contracts,
  getBlocksPerDay,
  getIchiVaultContract,
  getGenericPoolContract,
  getPoolReserves,
  getTotalSupply,
  getFarmingV2Contract,
  FarmingV2,
  getErc20Contract,
  PartialRecord,
  TokenName,
  PolygonPoolNumbers
} from '@ichidao/ichi-sdk';

export const toInt = (input: BigNumber) => {
  if (!input) return 0;
  return parseInt(input.toString());
};

// useBasic - true when we need to get the base LP instead of the full pool contract
// Used for Bancor and Smart Balancer pools
async function getPoolContract(
  poolID: number,
  farm: FarmingV2,
  adjusterPoolId: number,
  chainId: ChainId
): Promise<Contracts> {
  const provider = await getProvider(ChainId.Polygon);
  let isVault = Pools.ACTIVE_VAULTS[chainId].includes(poolID);
  let poolToken = await farm.lpToken(adjusterPoolId);

  if (isVault) {
    const poolContract = getIchiVaultContract(poolToken, provider);
    return poolContract;
  } else {
    const poolContract = getGenericPoolContract(poolToken, provider);
    return poolContract;
  }
}

async function getTokenData(tokenAddress: string, chainId: ChainId) {
  const provider = await getProvider(chainId);
  let tokenSymbol = '';
  let tokenDecimals = 0;

  if (tokenAddress === getAddress(AddressName.ETH, chainId)) {
    // special case for ETH
    tokenDecimals = 18;
    tokenSymbol = 'ETH';
  } else {
    for (const token of getTokens(chainId)) {
      if (token.address.toLowerCase() == tokenAddress.toLowerCase()) {
        return {
          symbol: token.symbol,
          decimals: token.decimals
        };
      }
    }

    let tokenContract = getErc20Contract(tokenAddress, provider);

    tokenSymbol = await tokenContract.symbol();
    tokenDecimals = await tokenContract.decimals();
  }

  return {
    symbol: tokenSymbol,
    decimals: tokenDecimals
  };
}

export async function getPoolRecord(
  poolId: PolygonPoolNumbers,
  tokenPrices: PartialRecord<TokenName, number>,
  _knownIchiPerBlock: PartialRecord<PolygonPoolNumbers, number>,
  graphFarm: false | GraphFarm,
  chainId: ChainId
): Promise<Optional<PoolRecord>> {
  if (isFarmExternal(poolId)) {
    // return getExternalPoolRecord(poolID, tokenPrices, knownIchiPerBlock);
    return;
  }

  const provider = await getProvider(ChainId.Polygon);
  const farming_V2 = getFarmingV2Contract(getAddress(AddressName.FARMING_V2, chainId), provider);

  let farm = farming_V2;
  let poolToken = '';
  let adjusterPoolId = poolId;

  adjusterPoolId = adjustedPid(poolId);
  poolToken = graphFarm ? graphFarm.LPToken : await farm.lpToken(adjusterPoolId);

  console.log(adjusterPoolId);

  // getting data for an active pool (or inactive pool not cached yet)
  let reward = 0;
  let bonusToRealRatio = 1;
  let inTheFarmLP = '';
  let rewardTokenDecimals = 18;
  let rewardTokenName = 'ichi';

  let rewardsPerBlock = 0;
  let ichiPerBlock_V2 = graphFarm ? graphFarm.ichiPerBlock : await farm.ichiPerBlock();
  rewardsPerBlock = Number(ichiPerBlock_V2);

  let totalAllocPoint = graphFarm ? graphFarm.totalAllocPoints : await farm.totalAllocPoint();

  let poolAllocPoint = 0;
  if (graphFarm) {
    poolAllocPoint = graphFarm.allocPoint;
  } else {
    let poolInfo = await farm.poolInfo(adjusterPoolId);
    poolAllocPoint = Number(poolInfo.allocPoint);
  }

  reward = Number(totalAllocPoint) === 0 ? 0 : (rewardsPerBlock * poolAllocPoint) / Number(totalAllocPoint);
  // TODO: Logic change, added toString
  inTheFarmLP = (await farm.getLPSupply(adjusterPoolId)).toString();

  const poolContract = await getPoolContract(poolId, farm, adjusterPoolId, chainId);

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
    //deposit pools
    token0 = poolToken;

    let token0data = await getTokenData(token0, chainId);

    token0Symbol = token0data.symbol;
    token0Decimals = token0data.decimals;

    reserve0Raw = Number(totalPoolLP) / 10 ** token0Decimals;
    localTVL = reserve0Raw;
  } else {
    // the rest of the pools
    let tokens = await getPoolTokens(poolContract, chainId, { poolId });
    token0 = tokens.token0;
    token1 = tokens.token1;

    let token0data = await getTokenData(token0, chainId);
    let token1data = await getTokenData(token1, chainId);

    token0Symbol = token0data.symbol;
    token0Decimals = token0data.decimals;
    token1Symbol = token1data.symbol;
    token1Decimals = token1data.decimals;

    let reserve = {};
    reserve = await getPoolReserves(poolContract, chainId, { poolId });

    let reserve0 = reserve['_reserve0'];
    let reserve1 = reserve['_reserve1'];
    reserve0Raw = reserve0 / 10 ** token0Decimals;
    reserve1Raw = reserve1 / 10 ** token1Decimals;

    token0 = token0 === getAddress(AddressName.ETH, chainId) ? tokens[TokenName.WETH].address : token0;
    token1 = token1 === getAddress(AddressName.ETH, chainId) ? tokens[TokenName.WETH].address : token1;

    let prices = {};
    prices[token0] = tokenPrices[token0Symbol.toLowerCase()];
    prices[token1] = tokenPrices[token1Symbol.toLowerCase()];

    // both tokens there
    if (prices[token0] && prices[token1]) {
      localTVL = reserve0Raw * prices[token0] + reserve1Raw * prices[token1];
    } else {
      if (prices[token0]) {
        localTVL = 2 * reserve0Raw * prices[token0];
      } else if (prices[token1]) {
        localTVL = 2 * reserve1Raw * prices[token1];
      }
      // else if (poolId == 19) {
      //   // special case for oneVBTC-vBTC pool, use uni pairs for price check
      //   let vBTC_price = tokenPrices['vbtc'];
      //   localTVL = 2 * reserve1Raw * vBTC_price;
      // }
      else {
        console.error(`Could not resolve poolId: ${poolId}`);
      }
    }
  }

  let apyTVL = Number(localTVL) * farmRatio;

  let dailyAPY = 0;
  if (apyTVL !== 0) {
    let ichiReturnUsd = (getBlocksPerDay(chainId) * reward * tokenPrices[rewardTokenName]) / apyTVL;
    dailyAPY = ichiReturnUsd * 100;
  }

  // calculate future APY for deposits
  let futureReward = 0.1; // 0.1 ichiPerBlock
  let futureIchiReturnUsd = (getBlocksPerDay(chainId) * futureReward * tokenPrices[rewardTokenName]) / apyTVL;
  let futureAPY = futureIchiReturnUsd * 100;
  if (apyTVL == 0) {
    futureAPY = 0;
  }

  const poolRecord: PoolRecord = {
    pool: poolId,
    lpAddress: poolToken,
    dailyAPY: dailyAPY,
    weeklyAPY: dailyAPY * 7,
    monthlyAPY: dailyAPY * 30,
    yearlyAPY: dailyAPY * 365,
    futureAPY: futureAPY * 365,
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

// TODO: Why is this returning an empty record?
// async function getExternalPoolRecord(poolID, tokenPrices, knownIchiPerBlock) {
//   return {};
// }
