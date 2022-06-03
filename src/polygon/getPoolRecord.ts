import { BigNumber, ethers } from 'ethers';
import { ADDRESSES, POOLS, TOKENS, BLOCKS_PER_DAY } from './configPolygon';
import FARMING_V2_ABI from '../abis/FARMING_V2_ABI.json';
import ERC20_ABI from '../abis/ERC20_ABI.json';
import PAIR_ABI from '../abis/PAIR_ABI.json';
import VAULT_ABI from '../abis/ICHI_VAULT_ABI.json';
import { GraphFarm } from '../subgraph/farm_v2';
import { adjustedPid, isFarmExternal } from '../utils/pids';
import { ChainId, getProvider } from '../providers';

export const toInt = (input: BigNumber) => {
  if (!input) return 0;
  return parseInt(input.toString());
};

// useBasic - true when we need to get the base LP instead of the full pool contract
// Used for Bancor and Smart Balancer pools
async function getPoolContract(poolID: number, useBasic: boolean, farm, adjusterPoolId: number) {
  const provider = await getProvider(ChainId.polygon);
  let isVault = POOLS.activeVaults.includes(poolID);
  let poolToken = await farm.lpToken(adjusterPoolId);

  if (isVault) {
    const poolContract = new ethers.Contract(poolToken, VAULT_ABI, provider);
    return poolContract;
  } else {
    const poolContract = new ethers.Contract(poolToken, PAIR_ABI, provider);
    return poolContract;
  }
}

async function getTokenData(token: string) {
  const provider = await getProvider(ChainId.polygon);
  let tokenSymbol = '';
  let tokenDecimals = 0;

  if (token === ADDRESSES.ETH) {
    // special case for ETH
    tokenDecimals = 18;
    tokenSymbol = 'ETH';
  } else {
    for (const tkn in TOKENS) {
      if (TOKENS[tkn].address.toLowerCase() == token.toLowerCase()) {
        return {
          symbol: tkn,
          decimals: TOKENS[tkn].decimals
        };
      }
    }

    let tokenContract = new ethers.Contract(token, ERC20_ABI, provider);

    console.log('======= SHOULD NOT BE HERE, make sure to add missing token to tokens table');

    tokenSymbol = await tokenContract.symbol();
    tokenDecimals = await tokenContract.decimals();
  }

  return {
    symbol: tokenSymbol,
    decimals: tokenDecimals
  };
}

async function getPoolTokens(poolID: number, poolContract) {
  let token0 = '';
  let token1 = '';

  token0 = await poolContract.token0();
  token1 = await poolContract.token1();
  token0 = token0.toLowerCase();
  token1 = token1.toLowerCase();

  return {
    token0: token0,
    token1: token1
  };
}

async function getPoolReserves(poolID: number, poolContract) {
  let isVault = POOLS.activeVaults.includes(poolID);

  if (isVault) {
    // vaults
    let reserveBalances = await poolContract.getTotalAmounts();
    return {
      _reserve0: Number(reserveBalances.total0),
      _reserve1: Number(reserveBalances.total1)
    };
  } else {
    // everything else
    let reserveBalances = await poolContract.getReserves();
    return {
      _reserve0: Number(reserveBalances._reserve0),
      _reserve1: Number(reserveBalances._reserve1)
    };
  }
}

async function getTotalSupply(poolID: number, poolContract, lpToken) {
  let tLP = await poolContract.totalSupply();
  return tLP.toString();
}

export async function getPoolRecord(poolID: number, tokenPrices, knownIchiPerBlock, graph_farm: false | GraphFarm) {
  if (isFarmExternal(poolID)) return getExternalPoolRecord(poolID, tokenPrices, knownIchiPerBlock);

  const provider = await getProvider(ChainId.polygon);
  const farming_V2 = new ethers.Contract(ADDRESSES.farming_V2, FARMING_V2_ABI, provider);

  let farm = farming_V2;
  let poolToken = '';
  let adjusterPoolId = poolID;

  adjusterPoolId = adjustedPid(poolID);
  poolToken = graph_farm ? graph_farm.LPToken : await farm.lpToken(adjusterPoolId);

  console.log(adjusterPoolId);

  // getting data for an active pool (or inactive pool not cached yet)
  let reward = 0;
  let bonusToRealRatio = 1;
  let inTheFarmLP = '';
  let rewardTokenDecimals = 18;
  let rewardTokenName = 'ichi';

  let rewardsPerBlock = 0;
  let ichiPerBlock_V2 = graph_farm ? graph_farm.ichiPerBlock : await farm.ichiPerBlock();
  rewardsPerBlock = Number(ichiPerBlock_V2);

  let totalAllocPoint = graph_farm ? graph_farm.totalAllocPoints : await farm.totalAllocPoint();

  let poolAllocPoint = 0;
  if (graph_farm) {
    poolAllocPoint = graph_farm.allocPoint;
  } else {
    let poolInfo = await farm.poolInfo(adjusterPoolId);
    poolAllocPoint = poolInfo.allocPoint;
  }

  reward = Number(totalAllocPoint) === 0 ? 0 : (rewardsPerBlock * poolAllocPoint) / Number(totalAllocPoint);
  inTheFarmLP = await farm.getLPSupply(adjusterPoolId);

  const poolContract = await getPoolContract(poolID, false, farm, adjusterPoolId);

  let poolRecord = {};

  // common calls
  reward = Number(reward) / 10 ** rewardTokenDecimals;
  reward = reward * bonusToRealRatio;

  let totalPoolLP = await getTotalSupply(poolID, poolContract, poolToken);

  let farmRatio = 0;
  if (Number(totalPoolLP) !== 0) {
    farmRatio = Number(inTheFarmLP) / Number(totalPoolLP);
  }

  let isDeposit = POOLS.depositPools.includes(poolID);

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

    let token0data = await getTokenData(token0);

    token0Symbol = token0data.symbol;
    token0Decimals = token0data.decimals;

    reserve0Raw = Number(totalPoolLP) / 10 ** token0Decimals;
    localTVL = reserve0Raw;
  } else {
    // the rest of the pools
    let tokens = await getPoolTokens(poolID, poolContract);
    token0 = tokens.token0;
    token1 = tokens.token1;

    let token0data = await getTokenData(token0);
    let token1data = await getTokenData(token1);

    token0Symbol = token0data.symbol;
    token0Decimals = token0data.decimals;
    token1Symbol = token1data.symbol;
    token1Decimals = token1data.decimals;

    let reserve = {};
    reserve = await getPoolReserves(poolID, poolContract);

    let reserve0 = reserve['_reserve0'];
    let reserve1 = reserve['_reserve1'];
    reserve0Raw = reserve0 / 10 ** token0Decimals;
    reserve1Raw = reserve1 / 10 ** token1Decimals;

    token0 = token0 === ADDRESSES.ETH ? tokens['weth']['address'] : token0;
    token1 = token1 === ADDRESSES.ETH ? tokens['weth']['address'] : token1;

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
      } else if (poolID == 19) {
        // special case for oneVBTC-vBTC pool, use uni pairs for price check
        let vBTC_price = tokenPrices['vbtc'];
        localTVL = 2 * reserve1Raw * vBTC_price;
      } else {
        console.log('==== error ====');
      }
    }
  }

  let apyTVL = Number(localTVL) * farmRatio;

  let dailyAPY = 0;
  if (apyTVL !== 0) {
    let ichiReturnUsd = (BLOCKS_PER_DAY * reward * tokenPrices[rewardTokenName]) / apyTVL;
    dailyAPY = ichiReturnUsd * 100;
  }

  // calculate future APY for deposits
  let futureReward = 0.1; // 0.1 ichiPerBlock
  let futureIchiReturnUsd = (BLOCKS_PER_DAY * futureReward * tokenPrices[rewardTokenName]) / apyTVL;
  let futureAPY = futureIchiReturnUsd * 100;
  if (apyTVL == 0) {
    futureAPY = 0;
  }

  poolRecord = {
    pool: poolID,
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

async function getExternalPoolRecord(poolID, tokenPrices, knownIchiPerBlock) {
  return {};
}
