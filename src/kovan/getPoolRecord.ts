import { ethers } from 'ethers';
import { ADDRESSES, TOKENS, POOLS } from './configKovan';
import FARMING_V2_ABI from './../abis/FARMING_V2_ABI.json';
import ERC20_ABI from './../abis/ERC20_ABI.json';
import PAIR_ABI from './../abis/PAIR_ABI.json';

const infuraId = process.env.INFURA_ID;
if (!infuraId) {
  console.error('Please export INFURA_ID=*** which is used for https://kovan.infura.io/v3/***');
  process.exit();
}

const RPC_HOST = `https://kovan.infura.io/v3/${infuraId}`;

const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);

const farming_V2 = new ethers.Contract(
    ADDRESSES.farming_V2,
    FARMING_V2_ABI,
    provider
);

async function getPoolContract(poolID) {
  const poolToken = await farming_V2.lpToken(poolID);
  const poolContract = new ethers.Contract(
    poolToken,
    PAIR_ABI,
    provider
  );
  return poolContract;
}
  
async function getTokenData(token, _provider) {
  let tokenSymbol = "";
  let tokenDecimals = 0;

  if (token === ADDRESSES.ETH) {
    // special case for ETH
    tokenDecimals = 18;
    tokenSymbol = "ETH";
  } else {
      for (const tkn in TOKENS) {
        if (TOKENS[tkn].address.toLowerCase() == token.toLowerCase()) {
          return {
            symbol: tkn,
            decimals: TOKENS[tkn].decimals
          }
        }
      }

      let tokenContract = new ethers.Contract(
        token,
        ERC20_ABI,
        _provider
      );

      console.log("======= SHOULD NOT BE HERE, make sure to add missing token to tokens table");

      tokenSymbol = await tokenContract.symbol();
      tokenDecimals = await tokenContract.decimals();
  }

  return {
    symbol: tokenSymbol,
    decimals: tokenDecimals
  }
}
  
  
async function getPoolTokens(poolContract) {
  let token0 = '';
  let token1 = '';

  token0 = await poolContract.token0();
  token1 = await poolContract.token1();
  token0 = token0.toLowerCase();
  token1 = token1.toLowerCase();

  return {
    token0: token0,
    token1: token1
  }
}
  
async function getPoolReserves(poolContract) {
  let reserveBalances = await poolContract.getReserves();
  return {
    _reserve0: Number(reserveBalances._reserve0),
    _reserve1: Number(reserveBalances._reserve1)
  }
}
  
async function getTotalSupply(poolContract) {
  let tLP = await poolContract.totalSupply();
  return tLP.toString();
}
  
export async function getPoolRecord(poolID, tokenPrices) {
  let adjusterPoolId = poolID - 5000;
  let poolToken = await farming_V2.lpToken(adjusterPoolId);

  // getting data for an active pool (or inactive pool not cached yet)
  let reward = 0;
  let bonusToRealRatio = 1;
  let inTheFarmLP = '';
  
  let ichiPerBlock_V2 = await farming_V2.ichiPerBlock();

  let totalAllocPoint = await farming_V2.totalAllocPoint();
  let poolInfo = await farming_V2.poolInfo(adjusterPoolId);
  let poolAllocPoint = poolInfo.allocPoint;

  reward = Number(ichiPerBlock_V2) * poolAllocPoint / totalAllocPoint;
  inTheFarmLP = await farming_V2.getLPSupply(adjusterPoolId);

  const poolContract = await getPoolContract(adjusterPoolId);

  let poolRecord = {};

  // common calls
  reward = Number(reward) / 10 ** 9;
  reward = reward * bonusToRealRatio;

  let totalPoolLP = await getTotalSupply(poolContract);
  
  let farmRatio = 0;
  if (Number(totalPoolLP) !== 0) {
    farmRatio = Number(inTheFarmLP) / Number(totalPoolLP);
  }

  let isDeposit = POOLS.depositPools.includes(poolID);

  let token0 = "";
  let token1 = "";
  let token0Symbol = "";
  let token1Symbol = "";
  let token0Decimals = 0;
  let token1Decimals = 0;
  let reserve0Raw = 0;
  let reserve1Raw = 0;
  let localTVL = 0;

  if (isDeposit) {
    token0 = poolToken;
  
    let token0data = await getTokenData(token0, provider);
  
    token0Symbol = token0data.symbol;
    token0Decimals = token0data.decimals;
  
    reserve0Raw = Number(totalPoolLP) / 10 ** token0Decimals;
    localTVL = reserve0Raw;
  
  } else {
    let tokens = await getPoolTokens(poolContract);
    token0 = tokens.token0;
    token1 = tokens.token1;
  
    let token0data = await getTokenData(token0, provider);
    let token1data = await getTokenData(token1, provider);
  
    token0Symbol = token0data.symbol;
    token0Decimals = token0data.decimals;
    token1Symbol = token1data.symbol;
    token1Decimals = token1data.decimals;
  
    let reserve = {};
    reserve = await getPoolReserves(poolContract);
  
    let reserve0 = reserve['_reserve0'];
    let reserve1 = reserve['_reserve1'];
    reserve0Raw = reserve0 / 10 ** token0Decimals;
    reserve1Raw = reserve1 / 10 ** token1Decimals;
  
    token0 = (token0 === ADDRESSES.ETH ? tokens['weth']['address'] : token0);
    token1 = (token1 === ADDRESSES.ETH ? tokens['weth']['address'] : token1);
  
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
        console.log("==== error ====");
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
    let ichiReturnUsd =
    6500 *
    reward *
    tokenPrices['test_ichi'] / apyTVL;
    dailyAPY = ichiReturnUsd * 100;
  }

  poolRecord = {
    pool: poolID,
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

