import { BigNumber } from 'ethers';
import axios from 'axios';
import { GraphFarm } from './subgraph/farm_v2';
import {
  Contracts,
  ChainId,
  getProvider,
  get1InchPools,
  getAddress,
  AddressName,
  MainnetPoolNumbers,
  getPoolLabel,
  TokenName,
  getToken,
  getBancorV3Pools,
  getPoolTokens,
  getPoolReserves,
  Pools,
  isFarmV1,
  isFarmExternal,
  isFarmGeneric,
  adjustedPid,
  getTokenData,
  getBlocksPerDay,
  PoolRecord,
  Optional,
  asBalancerPool,
  asGenericPool,
  getBalancerPoolContract,
  getBalancerSmartLpContract,
  getIchiVaultContract,
  getGenericPoolContract,
  getIchiBntContract,
  FarmingV2,
  FarmingV1,
  asFarmingV1,
  asFarmingV2,
  getFarmingV1Contract,
  getFarmingV2Contract,
  GenericFarmingV2,
  getGenericFarmingV2Contract,
  asGenericFarmingV2,
  PartialRecord,
  FarmingContracts,
  getDodoLiquidityPoolContract,
  getIchiBntV3Contract,
  getErc20Contract,
  getRariPoolLensContract,
  getRariPoolLensSecondaryContract,
  getDodoFarmContract
} from '@ichidao/ichi-sdk';

export const toInt = (input: BigNumber) => {
  if (!input) return 0;
  return parseInt(input.toString());
};

export const convertMantissaToAPY = (mantissa: any, dayRange: number = 35) => {
  const parsedMantissa = toInt(mantissa);
  return (Math.pow((parsedMantissa / 1e18) * 6500 + 1, dayRange) - 1) * 100;
};

export const convertMantissaToAPR = (mantissa: any) => {
  const parsedMantissa = toInt(mantissa);
  return (parsedMantissa * 2372500) / 1e16;
};

// useBasic - true when we need to get the base LP instead of the full pool contract
// Used for Bancor and Smart Balancer pools
async function getPoolContract(
  poolId: number,
  useBasic: boolean,
  farm: FarmingV1 | FarmingV2 | GenericFarmingV2,
  adjusterPoolId: number,
  chainId: ChainId
): Promise<Contracts> {
  let isBalancerPool = Pools.BALANCER_POOLS[chainId].includes(poolId);
  let isBancorPoolV2 = Pools.BANCOR_POOLS_V2[chainId].includes(poolId);
  let isBalancerSmartPool = Pools.BALANCER_SMART_POOLS[chainId].includes(poolId);
  let isVault = Pools.ACTIVE_VAULTS[chainId].includes(poolId) || Pools.UNDERLYING_VAULTS[chainId].includes(poolId);

  let poolToken = '';
  if (isFarmV1(poolId)) {
    // farm V1
    poolToken = await asFarmingV1(farm).getPoolToken(adjusterPoolId);
  } else {
    // farm V2 and generic farm V2
    poolToken = await asFarmingV2(farm).lpToken(adjusterPoolId);
  }

  const provider = await getProvider(chainId);
  if (isBancorPoolV2) {
    // exception for Bancor pools, getting proxy (pool owner) contract
    if (useBasic) {
      const poolContract = getGenericPoolContract(poolToken, provider);
      return poolContract;
    } else {
      const poolContract = getIchiBntContract(getAddress(AddressName.ICHI_BNT, chainId), provider);
      return poolContract;
    }
  } else if (isBalancerPool) {
    // exception for the Balancer pools
    const poolContract = getBalancerPoolContract(poolToken, provider);
    return poolContract;
  } else if (isBalancerSmartPool) {
    // exception for the Balancer Smart pools
    const lpContract = getBalancerSmartLpContract(poolToken, provider);
    const bPool = await lpContract.bPool();
    if (useBasic) {
      return lpContract;
    }
    const poolContract = getBalancerPoolContract(bPool, provider);
    return poolContract;
  } else if (isVault) {
    const poolContract = getIchiVaultContract(poolToken, provider);
    return poolContract;
  } else {
    const poolContract = getGenericPoolContract(poolToken, provider);
    return poolContract;
  }
}

async function getOneInchPoolTokenReserve(tokenAddress: string, poolAddress: string, chainId: ChainId) {
  const provider = await getProvider(chainId);
  if (tokenAddress === getAddress(AddressName.ETH, chainId)) {
    let tokenBalance = await provider.getBalance(poolAddress);
    return tokenBalance;
  } else {
    let tokenContract = getErc20Contract(tokenAddress, provider);
    let tokenBalance = await tokenContract.balanceOf(poolAddress);
    return tokenBalance;
  }
}

async function getOneInchPoolReserves(token0: string, token1: string, poolAddress: string, chainId: ChainId) {
  let token0reserve = await getOneInchPoolTokenReserve(token0, poolAddress, chainId);
  let token1reserve = await getOneInchPoolTokenReserve(token1, poolAddress, chainId);
  return {
    _reserve0: Number(token0reserve),
    _reserve1: Number(token1reserve)
  };
}

async function getBalancerPoolReserves(token0: string, token1: string, poolContract: Contracts) {
  let token0reserve = await asBalancerPool(poolContract).getBalance(token0);
  let token1reserve = await asBalancerPool(poolContract).getBalance(token1);
  return {
    _reserve0: Number(token0reserve),
    _reserve1: Number(token1reserve)
  };
}

async function getTotalSupply(
  poolId: MainnetPoolNumbers,
  poolContract: Contracts,
  lpTokenAddress: string,
  chainId: ChainId
): Promise<BigNumber> {
  const provider = await getProvider(chainId);
  let isBancorPoolV2 = Pools.BANCOR_POOLS_V2[chainId].includes(poolId);
  let isBalancerSmartPool = Pools.BALANCER_SMART_POOLS[chainId].includes(poolId);

  if (isBancorPoolV2) {
    // exception for Bancor V2 pool, getting proxy (pool owner) contract
    const bntContract = getIchiVaultContract(lpTokenAddress, provider);
    let tLP = await bntContract.totalSupply();
    return tLP;
  } else if (isBalancerSmartPool) {
    // exception for Balancer Smart pools, using LP contract instead of the bPool one
    const lpContract = getBalancerSmartLpContract(lpTokenAddress, provider);
    let tLP = await lpContract.totalSupply();
    return tLP;
  } else {
    let tLP = await asGenericPool(poolContract).totalSupply();
    return tLP;
  }
}

export async function getPoolRecord(
  poolId: MainnetPoolNumbers,
  tokenPrices: PartialRecord<TokenName, number>,
  knownIchiPerBlock: PartialRecord<MainnetPoolNumbers, number>,
  graph_farm: false | GraphFarm,
  chainId: ChainId
): Promise<PoolRecord> {
  if (isFarmExternal(poolId)) {
    return getExternalPoolRecord(poolId, tokenPrices, knownIchiPerBlock, chainId);
  }

  let isSpecialPricing = Pools.SPECIAL_PRICING[chainId].includes(poolId);

  let isOneInchPool = Pools.ONE_INCH_POOLS[chainId].includes(poolId);
  let isBalancerPool =
    Pools.BALANCER_POOLS[chainId].includes(poolId) || Pools.BALANCER_SMART_POOLS[chainId].includes(poolId);

  const provider = await getProvider(chainId);
  const farming_V1 = getFarmingV1Contract(getAddress(AddressName.FARMING_V1, chainId), provider);
  const farming_V2 = getFarmingV2Contract(getAddress(AddressName.FARMING_V2, chainId), provider);

  let farm: FarmingContracts = farming_V2;
  let poolToken = '';
  let adjusterPoolId = poolId;
  const poolLabel = getPoolLabel(poolId, chainId);
  if (isFarmV1(poolId)) {
    farm = farming_V1;
    poolToken = await farm.getPoolToken(adjusterPoolId);
  } else if (isFarmGeneric(poolId)) {
    farm = getGenericFarmingV2Contract(poolLabel.farmAddress, provider);
    adjusterPoolId = poolLabel.farmId;
    poolToken = await farm.lpToken(adjusterPoolId);
  } else {
    // getting here means it's V2 farm
    adjusterPoolId = adjustedPid(poolId);
    poolToken = graph_farm ? graph_farm.LPToken : await farm.lpToken(adjusterPoolId);
  }

  // getting data for an active pool (or inactive pool not cached yet)
  let reward = 0;
  let bonusToRealRatio = 1;
  let inTheFarmLP = '';
  let rewardTokenDecimals = 9;
  let rewardTokenName = TokenName.ICHI;

  if (isFarmV1(poolId)) {
    reward = Number(await asFarmingV1(farm).ichiReward(adjusterPoolId));
    // TODO: Logic change, there was no toString previously
    inTheFarmLP = (await farm.getLPSupply(adjusterPoolId)).toString();
  } else {
    let rewardsPerBlock = 0;
    if (isFarmGeneric(poolId)) {
      let res = await asGenericFarmingV2(farm).rewardTokensPerBlock();
      rewardsPerBlock = Number(res);
      rewardTokenDecimals = poolLabel.farmRewardTokenDecimals;
      rewardTokenName = poolLabel.farmRewardTokenName.toLowerCase() as TokenName;
    } else {
      let ichiPerBlock_V2 = graph_farm ? graph_farm.ichiPerBlock : await asFarmingV2(farm).ichiPerBlock();
      rewardsPerBlock = Number(ichiPerBlock_V2);
    }

    let totalAllocPoint = graph_farm ? graph_farm.totalAllocPoints : await farm.totalAllocPoint();

    let poolAllocPoint = 0;
    if (graph_farm) {
      poolAllocPoint = graph_farm.allocPoint;
    } else {
      let poolInfo = await asFarmingV2(farm).poolInfo(adjusterPoolId);
      poolAllocPoint = Number(poolInfo.allocPoint);
    }

    reward = Number(totalAllocPoint) === 0 ? 0 : (rewardsPerBlock * poolAllocPoint) / Number(totalAllocPoint);
    //inTheFarmLP = graph_farm ? graph_farm.farmLPSupply :await farm.getLPSupply(adjusterPoolId);
    // TODO: Logic change here, no toString previously
    inTheFarmLP = (await farm.getLPSupply(adjusterPoolId)).toString();
  } //LP Balance stacked

  const poolContract = await getPoolContract(poolId, false, farm, adjusterPoolId, chainId);

  // common calls
  reward = Number(reward) / 10 ** rewardTokenDecimals;
  reward = reward * bonusToRealRatio;

  // let totalPoolLP = graph_farm ? graph_farm.totalLPSupply : await getTotalSupply(poolID, poolContract, poolToken);
  let totalPoolLP = await getTotalSupply(poolId, poolContract, poolToken, chainId);

  let farmRatio = 0;
  if (Number(totalPoolLP) !== 0) {
    farmRatio = Number(inTheFarmLP) / Number(totalPoolLP);
  }

  // 1007 is commented out and was ICHIBPT
  // if (poolId == 1007) {
  //   //special case for oneToken Balancer pool
  //   let apyTVL = (Number(totalPoolLP) * farmRatio) / 10 ** 18;

  //   let dailyAPY = 0;
  //   if (apyTVL !== 0) {
  //     let ichiReturnUsd = (BLOCKS_PER_DAY * reward * tokenPrices[rewardTokenName]) / apyTVL;
  //     dailyAPY = ichiReturnUsd * 100;
  //   }

  //   poolRecord = {
  //     pool: poolId,
  //     lpAddress: poolToken,
  //     dailyAPY: dailyAPY,
  //     weeklyAPY: dailyAPY * 7,
  //     monthlyAPY: dailyAPY * 30,
  //     yearlyAPY: dailyAPY * 365,
  //     totalPoolLP: totalPoolLP,
  //     totalFarmLP: inTheFarmLP.toString(),
  //     tvl: Number(totalPoolLP) / 10 ** 18,
  //     farmTVL: apyTVL,
  //     reserve0Raw: 0,
  //     reserve1Raw: 0,
  //     address0: '',
  //     address1: '',
  //     decimals0: 0,
  //     decimals1: 0,
  //     token0: '',
  //     token1: ''
  //   };
  // }
  // else {
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
    if (isOneInchPool) {
      reserve = await getOneInchPoolReserves(token0, token1, poolToken, chainId);
    } else if (isBalancerPool) {
      reserve = await getBalancerPoolReserves(token0, token1, poolContract);
    } else {
      reserve = await getPoolReserves(poolContract, chainId, { poolId });
    }

    let reserve0 = reserve['_reserve0'];
    let reserve1 = reserve['_reserve1'];
    reserve0Raw = reserve0 / 10 ** token0Decimals;
    reserve1Raw = reserve1 / 10 ** token1Decimals;

    token0 = token0 === getAddress(AddressName.ETH, chainId) ? tokens['weth']['address'] : token0;
    token1 = token1 === getAddress(AddressName.ETH, chainId) ? tokens['weth']['address'] : token1;

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
      }
      // TODO: There is no more pool 19
      // else if (poolId == 19) {
      //   // special case for oneVBTC-vBTC pool, use uni pairs for price check
      //   let vBTC_price = tokenPrices['vbtc'];
      //   localTVL = 2 * reserve1Raw * vBTC_price;
      // }
      else {
        console.log('==== error ====');
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
    totalPoolLP: totalPoolLP.toString(),
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

const getDodoPools = async function (address: string, network: string) {
  let body = {
    query: `
        query Query($where: Mininginfo_filter) {
          mining_info (where: $where) {
            total_supply
            address
            apy
            lp_token
            balance
            mining_reward_usd
            blocks_count_perYear
          }
        }`,
    variables: {
      where: {
        address: address,
        chain: network
      }
    }
  };

  return await axios.post('https://gateway.dodoex.io/graphql', body);
};

async function getExternalPoolRecord(
  poolId: MainnetPoolNumbers,
  tokenPrices: PartialRecord<TokenName, number>,
  knownIchiPerBlock: PartialRecord<MainnetPoolNumbers, number>,
  chainId: ChainId
): Promise<Optional<PoolRecord>> {
  const provider = await getProvider(chainId);
  const poolLabel = getPoolLabel(poolId, chainId);

  if (poolId === MainnetPoolNumbers.ICHI_1INCH) {
    let allPools = await get1InchPools();
    let _1inchICHI_pool = allPools[5];

    let token0 = _1inchICHI_pool.apys[0].token;
    let token1 = _1inchICHI_pool.apys[1].token;

    let token0data = await getTokenData(token0, chainId);
    let token1data = await getTokenData(token1, chainId);

    let token0Symbol = token0data.symbol;
    let token1Symbol = token1data.symbol;

    let reserve = await getOneInchPoolReserves(
      token0,
      token1,
      getAddress(AddressName._1INCH_ICHI_LP, chainId),
      chainId
    );
    let reserve0 = reserve._reserve0;
    let reserve1 = reserve._reserve1;
    let reserve0Raw = reserve0 / 10 ** 18; //1inch
    let reserve1Raw = reserve1 / 10 ** 9; //ICHI

    let prices = {
      [token0]: tokenPrices[token0Symbol.toLowerCase()],
      [token1]: tokenPrices[token1Symbol.toLowerCase()]
    };

    let TVL = reserve0Raw * prices[token0] + reserve1Raw * prices[token1];

    let farmTVL = _1inchICHI_pool.liquidity_locked;
    let dailyAPY = (_1inchICHI_pool.apys[0].value + _1inchICHI_pool.apys[1].value) / 365;

    dailyAPY = 0; // hardcoded because the pool has ended

    const poolRecord: PoolRecord = {
      pool: poolId,
      lpAddress: getAddress(AddressName._1INCH_ICHI_LP, chainId),
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
      token0: '1inch',
      token1: 'ICHI'
    };

    return poolRecord;
  }
  // TODO: Review this, no longer a 10002 it appears
  // if (poolId === 10002) {
  //   let allPools = await getLoopringPools();
  //   let loopring_pool = allPools.data[97];

  //   let TVL = Number(loopring_pool.liquidityUSD);

  //   let farmTVL = TVL;
  //   let dailyAPY = Number(loopring_pool.apyBips) / 100 / 365;

  //   let poolRecord = {
  //     pool: poolId,
  //     lpAddress: '',
  //     dailyAPY: dailyAPY,
  //     weeklyAPY: dailyAPY * 7,
  //     monthlyAPY: dailyAPY * 30,
  //     yearlyAPY: dailyAPY * 365,
  //     totalPoolLP: '0',
  //     totalFarmLP: '0',
  //     tvl: TVL,
  //     farmTVL: farmTVL,
  //     reserve0Raw: 0,
  //     reserve1Raw: 0,
  //     address0: TOKENS['ichi']['address'],
  //     address1: ADDRESSES.ETH,
  //     decimals0: 9,
  //     decimals1: 18,
  //     token0: 'ICHI',
  //     token1: 'ETH'
  //   };

  //   return poolRecord;
  // }
  if (poolId === MainnetPoolNumbers.ICHI_BNT) {
    let token0 = getToken(TokenName.BNT, chainId).address;
    let token1 = getToken(TokenName.ICHI, chainId).address;

    const poolContract = getIchiBntContract(getAddress(AddressName.ICHI_BNT, chainId), provider);

    let reserve = await getPoolReserves(poolContract, chainId, { poolId });
    let reserve0 = reserve._reserve0;
    let reserve1 = reserve._reserve1;
    let reserve0Raw = reserve0 / 10 ** 18; //bnt
    let reserve1Raw = reserve1 / 10 ** 9; //ICHI

    let prices = {};
    prices[token0] = tokenPrices[TokenName.BNT];
    prices[token1] = tokenPrices[TokenName.ICHI];

    let TVL = reserve0Raw * prices[token0] + reserve1Raw * prices[token1];

    let farmTVL = reserve1Raw * prices[token1];
    let dailyAPY = 0;
    /*if (knownIchiPerBlock['10003']) {
      if (farmTVL !== 0) {
        let ichiReturnUsd =
          (BLOCKS_PER_DAY * (Number(knownIchiPerBlock['10003']) / 10 ** 9) * tokenPrices['ichi']) / farmTVL;
        dailyAPY = ichiReturnUsd * 100;
      }
    }*/

    const poolRecord: PoolRecord = {
      pool: poolId,
      lpAddress: '0x563f6e19197A8567778180F66474E30122FD702A',
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
      token0: 'BNT',
      token1: 'ICHI'
    };

    return poolRecord;
  }
  if (poolId === MainnetPoolNumbers.ONE_DODO_USDC_MAINNET) {
    let dodoPool = await getDodoPools(poolLabel.externalAddress, 'ethereum-mainnet');
    let info = dodoPool.data['data']['mining_info'];
    let lpAddress = info['lp_token'];
    let lpTotal = info['total_supply'];
    let lpFarm = info['balance'];
    let blocks_year = Number(info['blocks_count_perYear']);
    let ichi_reward_usd = Number(info['mining_reward_usd']);
    // console.log(info);

    if (!lpAddress) {
      return;
    }

    const poolContract = getDodoLiquidityPoolContract(lpAddress, provider);

    let reserve = await getPoolReserves(poolContract, chainId, { poolId });
    let reserve0 = reserve._reserve0;
    let reserve1 = reserve._reserve1;
    let reserve0Raw = reserve0 / 10 ** 18; //oneDODO
    let reserve1Raw = reserve1 / 10 ** 6; //USDC

    let TVL = reserve0Raw + reserve1Raw;

    let farmTVL = (TVL / Number(lpTotal)) * Number(lpFarm);

    const farmContract = getDodoFarmContract(poolLabel.externalAddress, provider);

    let dodo_reward_info = await farmContract.rewardTokenInfos('1');
    let dodo_reward_per_block = Number(dodo_reward_info['rewardPerBlock']) / 10 ** 18; // in DODOs
    let dodo_reward_usd = dodo_reward_per_block * blocks_year * tokenPrices[TokenName.DODO];
    let total_reward_usd = dodo_reward_usd + ichi_reward_usd;

    let yearlyAPY = (total_reward_usd / farmTVL) * 100;
    let dailyAPY = yearlyAPY / 365;

    const poolRecord: PoolRecord = {
      pool: poolId,
      lpAddress: lpAddress,
      dailyAPY: dailyAPY,
      weeklyAPY: dailyAPY * 7,
      monthlyAPY: dailyAPY * 30,
      yearlyAPY: yearlyAPY,
      totalPoolLP: lpTotal,
      totalFarmLP: lpFarm,
      tvl: TVL,
      farmTVL: farmTVL,
      reserve0Raw: reserve0Raw,
      reserve1Raw: reserve1Raw,
      address0: getToken(TokenName.ONE_DODO, chainId).address,
      address1: getToken(TokenName.USDC, chainId).address,
      decimals0: 18,
      decimals1: 6,
      token0: 'oneDODO',
      token1: 'USDC'
    };

    return poolRecord;
  }
  if (poolId === MainnetPoolNumbers.ONE_UNI) {
    const lensContract = getRariPoolLensContract(getAddress(AddressName.RARI_POOL_LENS, chainId), provider);
    const lensContractSecondary = getRariPoolLensSecondaryContract(
      getAddress(AddressName.RARI_POOL_LENS_SECONDARY, chainId),
      provider
    );

    // get rewardSpeed from the secondary lens contract
    let secondaryData = await lensContractSecondary.callStatic.getRewardSpeedsByPool(
      getAddress(AddressName.RARI_COMPTROLLER, chainId)
    );

    let rewardSpeed = 0;
    // make sure rewardSpeed matched the index of the oneBTC cToken address
    // cToken addresses are in array 0, rewardSpeeds are in array 3
    for (let i = 0; i < secondaryData[0].length; i++) {
      if (
        secondaryData[0][i].toString().toLowerCase() == getAddress(AddressName.RARI_ONEUNI_TOKEN, chainId).toLowerCase()
      ) {
        rewardSpeed = Number(secondaryData[3][i]);
        break;
      }
    }

    let data = await lensContract.callStatic.getPoolAssetsWithData(getAddress(AddressName.RARI_COMPTROLLER, chainId));

    let combinedAPR = 0;
    let reserve0 = 0;
    let poolLP = '';
    for (let item of data) {
      if (item['underlyingSymbol'] == getToken(TokenName.ONE_UNI, chainId).symbol) {
        const apr = convertMantissaToAPR(item['supplyRatePerBlock']);

        reserve0 = Number(item['totalSupply']);
        poolLP = item['totalSupply'].toString();

        const newRewardUSDPerBlock = Number(tokenPrices['ichi']) * (rewardSpeed / 10 ** 9);
        const newUnderlyingTotalSupplyUSD = reserve0 / 10 ** 18;
        const newMantissa = (newRewardUSDPerBlock * 1e18) / newUnderlyingTotalSupplyUSD;

        const rewardsAPR = convertMantissaToAPR(newMantissa);
        //console.log(rewradsAPR.toString());
        // combinedAPR = apr + rewardsAPR;
        combinedAPR = 0; // hardcode APR as 0
      }
    }
    //console.log(combinedAPR.toString());

    let reserve0Raw = reserve0 / 10 ** 18; //oneBTC
    let reserve1Raw = 0;

    let TVL = reserve0Raw + reserve1Raw;

    let farmTVL = TVL;

    let yearlyAPY = combinedAPR;
    let dailyAPY = yearlyAPY / 365;

    const poolRecord: PoolRecord = {
      pool: poolId,
      lpAddress: getToken(TokenName.ONE_UNI, chainId).address,
      dailyAPY: dailyAPY,
      weeklyAPY: dailyAPY * 7,
      monthlyAPY: dailyAPY * 30,
      yearlyAPY: yearlyAPY,
      totalPoolLP: poolLP,
      totalFarmLP: poolLP,
      tvl: TVL,
      farmTVL: farmTVL,
      reserve0Raw: reserve0Raw,
      reserve1Raw: reserve1Raw,
      address0: getToken(TokenName.ONE_UNI, chainId).address,
      address1: '',
      decimals0: 18,
      decimals1: 0,
      token0: 'oneUNI',
      token1: ''
    };

    return poolRecord;
  }
  if (poolId === MainnetPoolNumbers.ONE_UNI_VAULT) {
    let poolRecord = await getPoolRecord(
      MainnetPoolNumbers.ONE_UNI_VAULT_LP,
      tokenPrices,
      knownIchiPerBlock,
      false,
      chainId
    );
    let lpPrice = poolRecord.tvl / Number(poolRecord.totalPoolLP);

    const lensContract = getRariPoolLensContract(getAddress(AddressName.RARI_POOL_LENS, chainId), provider);

    const lensContractSecondary = getRariPoolLensSecondaryContract(
      getAddress(AddressName.RARI_POOL_LENS_SECONDARY, chainId),
      provider
    );

    // get rewardSpeed from the secondary lens contract
    let secondaryData = await lensContractSecondary.callStatic.getRewardSpeedsByPool(
      getAddress(AddressName.RARI_COMPTROLLER, chainId)
    );

    let rewardSpeed = 0;
    // make sure rewardSpeed matched the index of the VAULT LP cToken address
    // cToken addresses are in array 0, rewardSpeeds are in array 3
    for (let i = 0; i < secondaryData[0].length; i++) {
      if (
        secondaryData[0][i].toString().toLowerCase() ==
        getAddress(AddressName.RARI_ICHI_VAULT_LP_TOKEN, chainId).toLowerCase()
      ) {
        rewardSpeed = Number(secondaryData[3][i]);
        break;
      }
    }

    let data = await lensContract.callStatic.getPoolAssetsWithData(getAddress(AddressName.RARI_COMPTROLLER, chainId));

    let combinedAPR = 0;
    let reserve0 = 0;
    for (let item of data) {
      if (
        item['underlyingSymbol'] == 'ICHI_Vault_LP' &&
        item['cToken'].toLowerCase() == getAddress(AddressName.RARI_ICHI_VAULT_LP_TOKEN, chainId).toLowerCase()
      ) {
        // no base APR on Rari, because LPs can't be borrowed
        const apr = 0;
        //const apr = convertMantissaToAPR(item['supplyRatePerBlock'])

        reserve0 = Number(item['totalSupply']);

        const newRewardUSDPerBlock = Number(tokenPrices[TokenName.ICHI]) * (rewardSpeed / 10 ** 9);
        const newUnderlyingTotalSupplyUSD = reserve0 * lpPrice;
        const newMantissa = (newRewardUSDPerBlock * 1e18) / newUnderlyingTotalSupplyUSD;

        const rewardsAPR = convertMantissaToAPR(newMantissa);
        // combinedAPR = apr + rewardsAPR;
        combinedAPR = 0; // hardcode APR as 0
      }
    }

    let farmTVL = reserve0 * lpPrice;

    let yearlyAPY = combinedAPR;
    let dailyAPY = yearlyAPY / 365;

    poolRecord.pool = poolId;
    poolRecord.dailyAPY = dailyAPY;
    poolRecord.weeklyAPY = dailyAPY * 7;
    poolRecord.monthlyAPY = dailyAPY * 30;
    poolRecord.yearlyAPY = yearlyAPY;
    poolRecord.farmTVL = farmTVL;

    return poolRecord;
  }
  if (poolId === MainnetPoolNumbers.ONE_DODO_USDC_BSC_MAINNET) {
    let dodoPool = await getDodoPools(poolLabel.externalAddress, 'bsc');
    let info = dodoPool.data['data']['mining_info'];
    let lpAddress = info['lp_token'];
    let lpTotal = info['total_supply'];
    let lpFarm = info['balance'];
    let blocks_year = Number(info['blocks_count_perYear']);
    let ichi_reward_usd = Number(info['mining_reward_usd']);
    //console.log(info);

    if (!lpAddress) {
      return;
    }

    const bscProvider = await getProvider(ChainId.Bsc);
    const poolContract = getDodoLiquidityPoolContract(lpAddress, bscProvider);

    let reserve = await getPoolReserves(poolContract, chainId, { poolId });
    let reserve0 = reserve._reserve0;
    let reserve1 = reserve._reserve1;
    let reserve0Raw = reserve0 / 10 ** 18; //oneDODO
    let reserve1Raw = reserve1 / 10 ** 18; //USDC

    let TVL = reserve0Raw + reserve1Raw;

    let farmTVL = (TVL / Number(lpTotal)) * Number(lpFarm);

    const farmContract = getDodoFarmContract(poolLabel.externalAddress, bscProvider);

    let dodo_reward_info = await farmContract.rewardTokenInfos('0');
    let dodo_reward_per_block = Number(dodo_reward_info['rewardPerBlock']) / 10 ** 18; // in DODOs
    let dodo_reward_usd = dodo_reward_per_block * blocks_year * tokenPrices['dodo'];
    let total_reward_usd = dodo_reward_usd + ichi_reward_usd;

    let yearlyAPY = (total_reward_usd / farmTVL) * 100;
    let dailyAPY = yearlyAPY / 365;

    const poolRecord: PoolRecord = {
      pool: poolId,
      lpAddress: lpAddress,
      dailyAPY: dailyAPY,
      weeklyAPY: dailyAPY * 7,
      monthlyAPY: dailyAPY * 30,
      yearlyAPY: yearlyAPY,
      totalPoolLP: lpTotal,
      totalFarmLP: lpFarm,
      tvl: TVL,
      farmTVL: farmTVL,
      reserve0Raw: reserve0Raw,
      reserve1Raw: reserve1Raw,
      address0: getAddress(AddressName.ONE_DODO, ChainId.Bsc),
      address1: getAddress(AddressName.USDC, ChainId.Bsc),
      decimals0: 18,
      decimals1: 18,
      token0: 'oneDODO',
      token1: 'USDC'
    };

    return poolRecord;
  }
  if (poolId === MainnetPoolNumbers.ONE_BTC_VAULT_RARI) {
    let poolRecord = await getPoolRecord(
      MainnetPoolNumbers.ONE_BTC_VAULT_LEGACY,
      tokenPrices,
      knownIchiPerBlock,
      false,
      chainId
    );
    let lpPrice = poolRecord.tvl / Number(poolRecord.totalPoolLP);

    const lensContract = getRariPoolLensContract(getAddress(AddressName.RARI_POOL_LENS, chainId), provider);
    const lensContractSecondary = getRariPoolLensSecondaryContract(
      getAddress(AddressName.RARI_POOL_LENS_SECONDARY, chainId),
      provider
    );

    // get rewardSpeed from the secondary lens contract
    let secondaryData = await lensContractSecondary.callStatic.getRewardSpeedsByPool(
      getAddress(AddressName.RARI_COMPTROLLER, chainId)
    );

    let rewardSpeed = 0;
    // make sure rewardSpeed matched the index of the VAULT LP cToken address
    // cToken addresses are in array 0, rewardSpeeds are in array 3
    for (let i = 0; i < secondaryData[0].length; i++) {
      if (
        secondaryData[0][i].toString().toLowerCase() ==
        getAddress(AddressName.RARI_ONEBTC_VAULT_LP_TOKEN, chainId).toLowerCase()
      ) {
        rewardSpeed = Number(secondaryData[3][i]);
        break;
      }
    }

    let data = await lensContract.callStatic.getPoolAssetsWithData(getAddress(AddressName.RARI_COMPTROLLER, chainId));

    let combinedAPR = 0;
    let reserve0 = 0;
    for (let item of data) {
      if (
        item['underlyingSymbol'] == 'ICHI_Vault_LP' &&
        item['cToken'].toLowerCase() == getAddress(AddressName.RARI_ONEBTC_VAULT_LP_TOKEN, chainId).toLowerCase()
      ) {
        // no base APR on Rari, because LPs can't be borrowed
        const apr = 0;
        //const apr = convertMantissaToAPR(item['supplyRatePerBlock'])

        reserve0 = Number(item['totalSupply']);

        const newRewardUSDPerBlock = Number(tokenPrices[TokenName.ICHI]) * (rewardSpeed / 10 ** 9);
        const newUnderlyingTotalSupplyUSD = reserve0 * lpPrice;
        const newMantissa = (newRewardUSDPerBlock * 1e18) / newUnderlyingTotalSupplyUSD;

        const rewardsAPR = convertMantissaToAPR(newMantissa);
        combinedAPR = apr + rewardsAPR;
      }
    }

    let farmTVL = reserve0 * lpPrice;

    let yearlyAPY = combinedAPR;
    let dailyAPY = yearlyAPY / 365;

    poolRecord.pool = poolId;
    poolRecord.dailyAPY = dailyAPY;
    poolRecord.weeklyAPY = dailyAPY * 7;
    poolRecord.monthlyAPY = dailyAPY * 30;
    poolRecord.yearlyAPY = yearlyAPY;
    poolRecord.farmTVL = farmTVL;

    return poolRecord;
  }
  if (poolId === 10009) {
    const lensContract = getRariPoolLensContract(getAddress(AddressName.RARI_POOL_LENS, chainId), provider);

    const lensContractSecondary = getRariPoolLensSecondaryContract(
      getAddress(AddressName.RARI_POOL_LENS_SECONDARY, chainId),
      provider
    );

    // get rewardSpeed from the secondary lens contract
    let secondaryData = await lensContractSecondary.callStatic.getRewardSpeedsByPool(
      getAddress(AddressName.RARI_COMPTROLLER, chainId)
    );

    let rewardSpeed = 0;
    // make sure rewardSpeed matched the index of the oneUNI cToken address
    // cToken addresses are in array 0, rewardSpeeds are in array 3
    for (let i = 0; i < secondaryData[0].length; i++) {
      if (secondaryData[0][i].toString().toLowerCase() == getAddress(AddressName.RARI_ONEBTC, chainId).toLowerCase()) {
        rewardSpeed = Number(secondaryData[3][i]);
        break;
      }
    }

    let data = await lensContract.callStatic.getPoolAssetsWithData(getAddress(AddressName.RARI_COMPTROLLER, chainId));

    let combinedAPR = 0;
    let reserve0 = 0;
    let poolLP = '';
    for (let item of data) {
      if (item['underlyingSymbol'] == getToken(TokenName.ONE_BTC, chainId).symbol) {
        const apr = convertMantissaToAPR(item['supplyRatePerBlock']);

        reserve0 = Number(item['totalSupply']);
        poolLP = item['totalSupply'].toString();

        const newRewardUSDPerBlock = Number(tokenPrices['ichi']) * (rewardSpeed / 10 ** 9);
        const newUnderlyingTotalSupplyUSD = reserve0 / 10 ** 18;
        const newMantissa = (newRewardUSDPerBlock * 1e18) / newUnderlyingTotalSupplyUSD;

        const rewardsAPR = convertMantissaToAPR(newMantissa);
        // combinedAPR = apr + rewardsAPR;
        combinedAPR = 0; // hardcode APR as 0
      }
    }
    //console.log(combinedAPR.toString());

    let reserve0Raw = reserve0 / 10 ** 18; //oneUNI
    let reserve1Raw = 0;

    let TVL = reserve0Raw + reserve1Raw;

    let farmTVL = TVL;

    let yearlyAPY = combinedAPR;
    let dailyAPY = yearlyAPY / 365;

    const poolRecord: PoolRecord = {
      pool: poolId,
      lpAddress: getToken(TokenName.ONE_BTC, chainId).address,
      dailyAPY: dailyAPY,
      weeklyAPY: dailyAPY * 7,
      monthlyAPY: dailyAPY * 30,
      yearlyAPY: yearlyAPY,
      totalPoolLP: poolLP,
      totalFarmLP: poolLP,
      tvl: TVL,
      farmTVL: farmTVL,
      reserve0Raw: reserve0Raw,
      reserve1Raw: reserve1Raw,
      address0: getToken(TokenName.ONE_BTC, chainId).address,
      address1: '',
      decimals0: 18,
      decimals1: 0,
      token0: 'oneBTC',
      token1: ''
    };

    return poolRecord;
  }
  if (poolId === MainnetPoolNumbers.ICHI_BNT_V3) {
    let token0 = getToken(TokenName.BNT, chainId).address;
    let token1 = getToken(TokenName.ICHI, chainId).address;

    const poolContract = getIchiBntV3Contract(getAddress(AddressName.ICHI_BNT_V3, chainId), provider);

    let totalPoolLP = await getTotalSupply(poolId, poolContract, null, chainId);

    let prices: PartialRecord<TokenName, number> = {};
    prices[token0] = tokenPrices[TokenName.BNT];
    prices[token1] = tokenPrices[TokenName.ICHI];

    // TODO: Logic change, cast to Number added
    let reserve1Raw = Number(totalPoolLP) / 10 ** 9; //ICHI
    // let reserve1Raw = totalPoolLP.div(10).pow(9); //ICHI
    let reserve0Raw = (reserve1Raw * prices[token1]) / prices[token0]; //bnt

    let TVL = reserve1Raw * prices[token1] * 2;

    let farmTVL = reserve1Raw * prices[token1];

    let dailyAPY = 0;
    let allPools = await getBancorV3Pools();
    if (allPools && allPools['data'] && allPools['data']['data']) {
      let ichiPool = {};
      for (let index = 0; index < allPools['data']['data'].length; index++) {
        const pool = allPools['data']['data'][index];
        if (pool['poolTokenDltId'] == getAddress(AddressName.ICHI_BNT_V3, chainId)) {
          ichiPool = pool;
          break;
        }
      }
      if (ichiPool['fees7d']) {
        const fees = Number(ichiPool['fees7d']['tkn']);
        dailyAPY = (fees * 100) / farmTVL / 7;
      }
    }

    const poolRecord: PoolRecord = {
      pool: poolId,
      lpAddress: getAddress(AddressName.ICHI_BNT_V3, chainId),
      dailyAPY: dailyAPY,
      weeklyAPY: dailyAPY * 7,
      monthlyAPY: dailyAPY * 30,
      yearlyAPY: dailyAPY * 365,
      totalPoolLP: totalPoolLP.toString(),
      totalFarmLP: totalPoolLP.toString(),
      tvl: TVL,
      farmTVL: farmTVL,
      reserve0Raw: reserve0Raw,
      reserve1Raw: reserve1Raw,
      address0: token0,
      address1: token1,
      decimals0: 18,
      decimals1: 9,
      token0: 'BNT',
      token1: 'ICHI'
    };

    return poolRecord;
  }
  return undefined;
}
