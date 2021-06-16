import { ethers } from 'ethers';
import { ADDRESSES, POOLS, TOKENS, APIS } from './configMainnet';
import FARMING_V1_ABI from './abis/FARMING_V1_ABI.json';
import FARMING_V2_ABI from './abis/FARMING_V2_ABI.json';
import ERC20_ABI from './abis/ERC20_ABI.json';
import BALANCER_ABI from './abis/BALANCER_ABI.json';
import BALANCER_SMART_LP_ABI from './abis/BALANCER_SMART_LP_ABI.json';
import PAIR_ABI from './abis/PAIR_ABI.json';
import ICHI_BNT_ABI from './abis/ICHI_BNT_ABI.json';
import axios from 'axios';

const infuraId = process.env.INFURA_ID;
if (!infuraId) {
  console.error('Please export INFURA_ID=*** which is used for https://mainnet.infura.io/v3/***');
  process.exit();
}

const RPC_HOST = `https://mainnet.infura.io/v3/${infuraId}`;

const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);

const farming_V1 = new ethers.Contract(
    ADDRESSES.farming_V1,
    FARMING_V1_ABI,
    provider
);
const farming_V2 = new ethers.Contract(
    ADDRESSES.farming_V2,
    FARMING_V2_ABI,
    provider
);

async function getICHIBNTContract() {
  const poolContract = new ethers.Contract(
    ADDRESSES.ICHI_BNT,
    ICHI_BNT_ABI,
    provider
  );
  return poolContract;
}

// useBasic - true when we need to get the base LP instead of the full pool contract
// Used for Bancor and Smart Balancer pools 
async function getPoolContract(poolID, useBasic) {

    let isBalancerPool = POOLS.balancerPools.includes(poolID);
    let isBancorPool = POOLS.bancorPools.includes(poolID);
    let isBalancerSmartPool = POOLS.balancerSmartPools.includes(poolID);
  
    let poolToken = '';
    if (poolID < 1000 || poolID >= 10000) {
      // farm V1
      poolToken = await farming_V1.getPoolToken(poolID);
    } else {
      // farm V2
      poolToken = await farming_V2.lpToken(poolID-1000);
    }
  
    if (isBancorPool) {
      // exception for Bancor pools, getting proxy (pool owner) contract
      if (useBasic) {
        const poolContract = new ethers.Contract(
          poolToken,
          PAIR_ABI,
          provider
        );
        return poolContract;
      } else {
        const poolContract = new ethers.Contract(
          ADDRESSES.ICHI_BNT,
          ICHI_BNT_ABI,
          provider
        );
        return poolContract;
      }
    } else if (isBalancerPool) {
      // exception for the Balancer pools
      const poolContract = new ethers.Contract(
        poolToken,
        BALANCER_ABI,
        provider
      );
      return poolContract;
    } else if (isBalancerSmartPool) {
        // exception for the Balancer Smart pools
        const lpContract = new ethers.Contract(
            poolToken,
            BALANCER_SMART_LP_ABI,
            provider
        );
        const bPool = await lpContract.bPool();
        if (useBasic) {
            return lpContract;
        }
        const poolContract = new ethers.Contract(
            bPool,
            BALANCER_ABI,
            provider
        );
        return poolContract;
    } else {
        const poolContract = new ethers.Contract(
          poolToken,
          PAIR_ABI,
          provider
        );
        return poolContract;
    }
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
  
  
  async function getPoolTokens(poolID, poolContract) {
  
    let isBalancerPool = POOLS.balancerPools.includes(poolID) || POOLS.balancerSmartPools.includes(poolID);
    let isBancorPool = POOLS.bancorPools.includes(poolID);
  
    let token0 = '';
    let token1 = '';
  
    if (isBancorPool) {
        // exception for Bancor pools, getting proxy (pool owner) contract
        let tokens = await poolContract.reserveTokens();
        token0 = tokens[0].toLowerCase();
        token1 = tokens[1].toLowerCase();
    } else if (isBalancerPool) {
        // exception for Balancer pools
        let tokens = await poolContract.getCurrentTokens();
        token0 = tokens[0].toLowerCase();
        token1 = tokens[1].toLowerCase();
    } else {
        // everything else
        token0 = await poolContract.token0();
        token1 = await poolContract.token1();
        token0 = token0.toLowerCase();
        token1 = token1.toLowerCase();
    }
  
    return {
      token0: token0,
      token1: token1
    }
  }
  
  async function getOneInchPoolTokenReserve(token, poolAddress) {
    if (token === ADDRESSES.ETH) {
      let tokenBalance = await provider.getBalance(poolAddress);
      return tokenBalance;
    } else {
      let tokenContract = new ethers.Contract(
        token,
        ERC20_ABI,
        provider
      );
      let tokenBalance = await tokenContract.balanceOf(poolAddress);
      return tokenBalance;
    }
  }
  
  async function getOneInchPoolReserves(token0, token1, poolAddress) {
    let token0reserve = await getOneInchPoolTokenReserve(token0, poolAddress);
    let token1reserve = await getOneInchPoolTokenReserve(token1, poolAddress);
    return {
      _reserve0: Number(token0reserve),
      _reserve1: Number(token1reserve)
    }
  }
  
  async function getBalancerPoolReserves(token0, token1, poolContract) {
    let token0reserve = await poolContract.getBalance(token0);
    let token1reserve = await poolContract.getBalance(token1);
    return {
      _reserve0: Number(token0reserve),
      _reserve1: Number(token1reserve)
    }
  }
  
  async function getPoolReserves(poolID, poolContract) {
  
    let isBancorPool = POOLS.bancorPools.includes(poolID);
  
    if (isBancorPool) {
      // exception for Bancor pool, getting proxy (pool owner) contract
      let reserveBalances = await poolContract.reserveBalances();
      return {
        _reserve0: Number(reserveBalances[0]),
        _reserve1: Number(reserveBalances[1])
      }
    } else {
      // everything else
      let reserveBalances = await poolContract.getReserves();
      return {
        _reserve0: Number(reserveBalances._reserve0),
        _reserve1: Number(reserveBalances._reserve1)
      }
    }
  }
  
  async function getTotalSupply(poolID, poolContract, lpToken) {
  
    let isBancorPool = POOLS.bancorPools.includes(poolID);
    let isBalancerSmartPool = POOLS.balancerSmartPools.includes(poolID);
  
    let poolToken = '';
    if (poolID < 1000 || poolID >= 10000) {
      poolToken = await farming_V1.getPoolToken(poolID);
    } else {
      poolToken = await farming_V2.lpToken(poolID-1000);
    }
  
    if (isBancorPool) {
      // exception for Bancor pools, getting proxy (pool owner) contract
      const bntContract = new ethers.Contract(
        poolToken,
        PAIR_ABI,
        provider
      );
      let tLP = await bntContract.totalSupply();
      return tLP.toString();
    } else if (isBalancerSmartPool) {
      // exception for Balancer Smart pools, using LP contract instead of the bPool one
      const lpContract = new ethers.Contract(
        lpToken,
        BALANCER_SMART_LP_ABI,
        provider
      );
      let tLP = await lpContract.totalSupply();
      return tLP.toString();
    } else {
      let tLP = await poolContract.totalSupply();
      return tLP.toString();
    }
  }
  
  export async function getPoolRecord(poolID, tokenPrices) {
    if (poolID >= 10000)
      return getExternalPoolRecord(poolID, tokenPrices);

    let isSpecialPricing = POOLS.specialPricing.includes(poolID);
  
    let isOneInchPool = POOLS.oneInchPools.includes(poolID);
    let isBalancerPool = POOLS.balancerPools.includes(poolID) || POOLS.balancerSmartPools.includes(poolID);
  
    let poolToken = '';
    if (poolID < 1000 || poolID >= 10000) {
      poolToken = await farming_V1.getPoolToken(poolID);
    } else {
      poolToken = await farming_V2.lpToken(poolID-1000);
    }
  
      // getting data for an active pool (or inactive pool not cached yet)
      let reward = 0;
      let bonusToRealRatio = 1;
      let inTheFarmLP = '';
      
      if (poolID < 1000 || poolID >= 10000) {
        reward = await farming_V1.ichiReward(poolID);
        // bonusToRealRatio = await farming_V1.getBonusToRealRatio(poolID);
        // bonusToRealRatio = (100 - Number(bonusToRealRatio)) / 50;
        inTheFarmLP = await farming_V1.getLPSupply(poolID);
      } else {
        let ichiPerBlock_V2 = await farming_V2.ichiPerBlock();
  
        let totalAllocPoint = await farming_V2.totalAllocPoint();
        let poolInfo = await farming_V2.poolInfo(poolID-1000);
        let poolAllocPoint = poolInfo.allocPoint;
  
        reward = Number(ichiPerBlock_V2) * poolAllocPoint / totalAllocPoint;
        inTheFarmLP = await farming_V2.getLPSupply(poolID-1000);
      }
  
      const poolContract = await getPoolContract(poolID, false);
  
      let poolRecord = {};
  
      // common calls
      reward = Number(reward) / 10 ** 9;
      reward = reward * bonusToRealRatio;
  
      let totalPoolLP = await getTotalSupply(poolID, poolContract, poolToken);
      
      let farmRatio = 0;
      if (Number(totalPoolLP) !== 0) {
        farmRatio = Number(inTheFarmLP) / Number(totalPoolLP);
      }
  
      if (poolID == 1007) {
        //special case for oneToken Balancer pool
        let apyTVL = Number(totalPoolLP) * farmRatio / 10 ** 18;
  
        let dailyAPY = 0;
        if (apyTVL !== 0) {
          let ichiReturnUsd =
          6500 *
          reward *
          tokenPrices['ichi'] / apyTVL;
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
          tvl: Number(totalPoolLP) / 10 ** 18,
          farmTVL: apyTVL,
          reserve0Raw: 0,
          reserve1Raw: 0,
          address0: "",
          address1: "",
          decimals0: 0,
          decimals1: 0,
          token0: "",
          token1: ""
        };
  
      } else {

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
          //deposit pools
          token0 = poolToken;
        
          let token0data = await getTokenData(token0, provider);
        
          token0Symbol = token0data.symbol;
          token0Decimals = token0data.decimals;
        
          reserve0Raw = Number(totalPoolLP) / 10 ** token0Decimals;
          localTVL = reserve0Raw;
        
        } else {
          // the rest of the pools
          let tokens = await getPoolTokens(poolID, poolContract);
          token0 = tokens.token0;
          token1 = tokens.token1;
      
          let token0data = await getTokenData(token0, provider);
          let token1data = await getTokenData(token1, provider);
      
          token0Symbol = token0data.symbol;
          token0Decimals = token0data.decimals;
          token1Symbol = token1data.symbol;
          token1Decimals = token1data.decimals;
      
          let reserve = {};
          if (isOneInchPool) {
            reserve = await getOneInchPoolReserves(token0, token1, poolToken);
          } else if (isBalancerPool) {
            reserve = await getBalancerPoolReserves(token0, token1, poolContract);
          } else {
            reserve = await getPoolReserves(poolID, poolContract);
          }
      
          let reserve0 = reserve['_reserve0'];
          let reserve1 = reserve['_reserve1'];
          reserve0Raw = reserve0 / 10 ** token0Decimals;
          reserve1Raw = reserve1 / 10 ** token1Decimals;
      
          token0 = (token0 === ADDRESSES.ETH ? tokens['weth']['address'] : token0);
          token1 = (token1 === ADDRESSES.ETH ? tokens['weth']['address'] : token1);
      
          let prices = {};
          if (!isSpecialPricing) {
            prices[token0] = tokenPrices[token0Symbol.toLowerCase()];
            prices[token1] = tokenPrices[token1Symbol.toLowerCase()];
          } 
      
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
              console.log("==== error ====");
            }
          }

        }
          
        let apyTVL = Number(localTVL) * farmRatio;
  
        let dailyAPY = 0;
        if (apyTVL !== 0) {
          let ichiReturnUsd =
          6500 *
          reward *
          tokenPrices['ichi'] / apyTVL;
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
      }
  
      return poolRecord;
  }

  const get1inchPools = async function() {
    return await axios.get(
      APIS._1inchPoolAPI
    );
  };
  
  const getLoopringPools = async function() {
    return await axios.get(
      APIS.loopringAPI
    );
  };
  
  async function getExternalPoolRecord(poolID, tokenPrices) {
      if (poolID === 10001) {
        let allPools = await get1inchPools();
        let _1inchICHI_pool = allPools.data[5];
  
        let token0 = _1inchICHI_pool.apys[0].token;
        let token1 = _1inchICHI_pool.apys[1].token;
  
        let token0data = await getTokenData(token0, provider);
        let token1data = await getTokenData(token1, provider);
    
        let token0Symbol = token0data.symbol;
        let token1Symbol = token1data.symbol;

        let reserve = await getOneInchPoolReserves(token0, token1, ADDRESSES._1inch_ICHI_LP);
        let reserve0 = reserve._reserve0;
        let reserve1 = reserve._reserve1;
        let reserve0Raw = reserve0 / 10 ** 18; //1inch
        let reserve1Raw = reserve1 / 10 ** 9; //ICHI
  
        let prices = {};
        prices[token0] = tokenPrices[token0Symbol.toLowerCase()];
        prices[token1] = tokenPrices[token1Symbol.toLowerCase()];

        let TVL = reserve0Raw * prices[token0] + reserve1Raw * prices[token1];
  
        let farmTVL = _1inchICHI_pool.liquidity_locked;
        let dailyAPY = (_1inchICHI_pool.apys[0].value + _1inchICHI_pool.apys[1].value) / 365;
  
        let poolRecord = {
          pool: poolID,
          lpAddress: ADDRESSES._1inch_ICHI_LP,
          dailyAPY: dailyAPY,
          weeklyAPY: dailyAPY * 7,
          monthlyAPY: dailyAPY * 30,
          yearlyAPY: dailyAPY * 365,
          totalPoolLP: '0',
          totalFarmLP: '0',
          tvl: TVL,
          farmTVL: farmTVL,
          reserve0Raw: 0,
          reserve1Raw: 0,
          address0: token0,
          address1: token1,
          decimals0: 18,
          decimals1: 9,
          token0: "1inch",
          token1: "ICHI"
        };
  
        return poolRecord;
      }
      if (poolID === 10002) {
        let allPools = await getLoopringPools();
        let loopring_pool = allPools.data[97];
  
        let TVL = Number(loopring_pool.liquidityUSD);
  
        let farmTVL = TVL;
        let dailyAPY = (Number(loopring_pool.apyBips) / 100) / 365;
  
        let poolRecord = {
          pool: poolID,
          lpAddress: "",
          dailyAPY: dailyAPY,
          weeklyAPY: dailyAPY * 7,
          monthlyAPY: dailyAPY * 30,
          yearlyAPY: dailyAPY * 365,
          totalPoolLP: '0',
          totalFarmLP: '0',
          tvl: TVL,
          farmTVL: farmTVL,
          reserve0Raw: 0,
          reserve1Raw: 0,
          address0: TOKENS['ichi']['address'],
          address1: ADDRESSES.ETH,
          decimals0: 9,
          decimals1: 18,
          token0: "ICHI",
          token1: "ETH"
        };
  
        return poolRecord;
      }
      if (poolID === 10003) {
        let token0 = TOKENS.bnt.address;
        let token1 = TOKENS.ichi.address;

        const poolContract = await getICHIBNTContract();
  
        let reserve = await getPoolReserves(poolID, poolContract);
        let reserve0 = reserve._reserve0;
        let reserve1 = reserve._reserve1;
        let reserve0Raw = reserve0 / 10 ** 18; //bnt
        let reserve1Raw = reserve1 / 10 ** 9; //ICHI
  
        let prices = {};
        prices[token0] = tokenPrices["bnt"];
        prices[token1] = tokenPrices["ichi"];

        let TVL = reserve0Raw * prices[token0] + reserve1Raw * prices[token1];
  
        let farmTVL = reserve1Raw * prices[token1];
        let dailyAPY = 0;
  
        let poolRecord = {
          pool: poolID,
          lpAddress: "0x563f6e19197A8567778180F66474E30122FD702A",
          dailyAPY: dailyAPY,
          weeklyAPY: dailyAPY * 7,
          monthlyAPY: dailyAPY * 30,
          yearlyAPY: dailyAPY * 365,
          totalPoolLP: '0',
          totalFarmLP: reserve1.toString(),
          tvl: TVL,
          farmTVL: farmTVL,
          reserve0Raw: reserve0Raw,
          reserve1Raw: reserve1Raw,
          address0: token0,
          address1: token1,
          decimals0: 18,
          decimals1: 9,
          token0: "BNT",
          token1: "ICHI"
        };
  
        return poolRecord;
      }
      return {};
  }
  