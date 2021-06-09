const CHAIN_ID = 1;

const ADDRESSES = {
  // to look for BNT Converter addresses us this contract: 0xC0205e203F423Bcd8B2a4d6f8C8A154b0Aa60F19
  ICHI_BNT: "0x4a2F0Ca5E03B2cF81AebD936328CF2085037b63B",
  ICHIBPT: "0x96855eDEfC3Ad2d9eFD0421F301d1324e1e93a52",
  ETH: "0x0000000000000000000000000000000000000000",
  farming_V1: "0xcC50953A743B9CE382f423E37b07Efa6F9d9B000",
  farming_V2: "0x275dFE03bc036257Cd0a713EE819Dbd4529739c8",
  _1inch_ICHI_LP: "0x1dcE26F543E591c27717e25294AEbbF59AD9f3a5",
};

const APIS = {
  etherscanAPI: "2T21NRQVRKS7RHZG16K5X82FAQE8E4EPR7",
  loopringAPI: "https://api3.loopring.io/api/v3/poolsStats",
  _1inchPoolAPI: "https://governance.1inch.exchange/v1.1/farming/pools",
};

const TOKENS = {
  ichi: {
    address: "0x903bEF1736CDdf2A537176cf3C64579C3867A881",
    decimals: 9,
    displayName: "ICHI",
    isOneToken: false
  },
  xichi: {
    address: "0x70605a6457B0A8fBf1EEE896911895296eAB467E",
    decimals: 9,
    displayName: "xICHI",
    isOneToken: false
  },
  bnt: {
    address: "0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C",
    decimals: 18,
    displayName: "BNT",
    isOneToken: false
  },
  '1inch': {
    address: "0x111111111117dC0aa78b770fA6A738034120C302",
    decimals: 18,
    displayName: "1INCH",
    isOneToken: false
  },
  pwing: {
    address: "0xDb0f18081b505A7DE20B18ac41856BCB4Ba86A1a",
    decimals: 9,
    displayName: "pWING",
    isOneToken: false
  },
  wbtc: {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    displayName: "wBTC",
    isOneToken: false
  },
  weth: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    displayName: "wETH",
    isOneToken: false
  },
  vbtc: {
    address: "0xe1406825186D63980fd6e2eC61888f7B91C4bAe4",
    decimals: 18,
    displayName: "VBTC",
    isOneToken: false
  },
  link: {
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
    displayName: "LINK",
    isOneToken: false
  },
  uni: {
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    decimals: 9,
    displayName: "UNI",
    isOneToken: false
  },
  usdc: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    displayName: "USDC",
    isOneToken: false
  },
  oneeth: { 
    address: "0xEc0d77a58528a218cBf41Fa6E1585c8D7A085868",
    decimals: 9,
    displayName: "oneETH",
    isOneToken: true,
    isV2: false
  },
  onebtc: { 
    address: "0xC88F47067dB2E25851317A2FDaE73a22c0777c37",
    decimals: 9,
    displayName: "oneBTC",
    isOneToken: true,
    isV2: false
  },
  onevbtc: { 
    address: "0x7BD198b9107496fD5cC3d7655AF52f43a8eDBc4C",
    decimals: 9,
    displayName: "oneVBTC",
    isOneToken: true,
    isV2: false
  },
  onewing: { 
    address: "0x8F041A3940a5e6FB580075C3774E15FcFA0E1618",
    decimals: 9,
    displayName: "oneWING",
    isOneToken: true,
    isV2: false
  },
  onelink: { 
    address: "0x18Cc17a1EeD37C02A77B0B96b7890C7730E2a2CF",
    decimals: 9,
    displayName: "oneLINK",
    isOneToken: true,
    isV2: false
  }
}

const POOLS = {
  activePools : [8, 9, 10, 12, 13, 19, 1001, 1003, 1004, 1005, 1006, 1007, 1008, 10001, 10002],
  //activePools : [8, 1006, 1007, 10001, 10002],
  depositPools : [],
  upcomingPools : [],
  migratingPools : [],
  retiredPools : [],
  oneInchPools : [15, 16, 10001],
  balancerPools : [18, 1001, 1002, 1008],
  balancerSmartPools : [1003, 1007],
  bancorPools : [14, 1006],
  uniPools : [1005],
  loopringPools : [10002],
  specialPricing : [19]
}

const LABELS = {};
LABELS[8] = {
  name: 'oneBTC-wBTC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneBTC-WBTC',
  shortLpName: 'SLP OneBTC-WBTC',
  tradeUrl: 'https://app.sushi.com/add/0xC88F47067dB2E25851317A2FDaE73a22c0777c37/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
}
LABELS[9] = {
  name: 'oneLINK-LINK',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneLINK-LINK',
  shortLpName: 'OneLINK-LINK',
  tradeUrl: 'https://app.sushi.com/add/0x18Cc17a1EeD37C02A77B0B96b7890C7730E2a2CF/0x514910771af9ca656af840dff83e8264ecf986ca'
}
LABELS[10] = {
  name: 'ICHI-ETH',
  lpName: 'SLP (Sushiswap Liquidity Pool) ICHI-ETH',
  shortLpName: 'SLP ICHI-ETH',
  tradeUrl: 'https://app.sushi.com/add/0x903bEF1736CDdf2A537176cf3C64579C3867A881/ETH'
}
LABELS[12] = {
  name: 'oneETH-USDC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneETH-USDC',
  shortLpName: 'SLP OneETH-USDC',
  tradeUrl: 'https://app.sushi.com/add/0xec0d77a58528a218cbf41fa6e1585c8d7a085868/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
}
LABELS[13] = {
  name: 'oneWING-USDC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneWING-USDC',
  shortLpName: 'SLP OneWING-USDC',
  tradeUrl: 'https://app.sushi.com/add/0x8F041A3940a5e6FB580075C3774E15FcFA0E1618/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
}
LABELS[19] = {
  name: 'oneVBTC-vBTC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneVBTC-vBTC',
  shortLpName: 'OneVBTC-vBTC',
  tradeUrl: 'https://app.sushi.com/add/0x7BD198b9107496fD5cC3d7655AF52f43a8eDBc4C/0xe1406825186D63980fd6e2eC61888f7B91C4bAe4'
}
LABELS[10001] = {
  name: 'ICHI-1inch',
  lpName: '1LP-1INCH-ICHI',
  shortLpName: '1LP-1INCH-ICHI',
  externalUrl: 'https://app.1inch.io/#/1/dao/farming',
  externalText: 'Earn $ICHI & $1INCH',
  externalButton: '1INCH'
}
LABELS[10002] = {
  name: 'ICHI-ETH',
  lpName: '1LP-1INCH-ICHI',
  shortLpName: '1LP-1INCH-ICHI',
  externalUrl: 'https://exchange.loopring.io/pool',
  externalText: 'Earn $ICHI',
  externalButton: 'Loopring'
}
LABELS[1001] = {
  name: '80/20 ICHI-ETH',
  lpName: 'BPT (Balancer Pool Token) ICHI-ETH',
  shortLpName: 'BPT ICHI-ETH',
  tradeUrl: 'https://pools.balancer.exchange/#/pool/0x58378f5F8Ca85144ebD8e1E5e2ad95B02D29d2BB'
}
LABELS[1003] = {
  name: 'Smart ICHI-ETH',
  lpName: 'ICHI_ETH_SBPT',
  shortLpName: 'ICHI_ETH_SBPT',
  tradeUrl: 'https://pools.balancer.exchange/#/pool/0x6dB2d9841b3Fe166F258221c5502dc6Eb465b38D'
}
LABELS[1004] = {
  name: 'ICHI-ETH',
  lpName: 'SLP (Sushiswap Liquidity Pool) ICHI-ETH',
  shortLpName: 'SLP ICHI-ETH',
  tradeUrl: 'https://app.sushi.com/add/0x903bEF1736CDdf2A537176cf3C64579C3867A881/ETH'
}
LABELS[1005] = {
  name: 'ICHI-ETH',
  lpName: 'UNI-V2 ICHI-ETH',
  shortLpName: 'UNI-V2 ICHI-ETH',
  tradeUrl: 'https://app.uniswap.org/#/add/0x903bEF1736CDdf2A537176cf3C64579C3867A881/ETH'
}
LABELS[1006] = {
  name: 'ICHI-BNT',
  lpName: 'ICHIBNT',
  shortLpName: 'ICHIBNT',
  tradeUrl: 'https://app.bancor.network/eth/pool/add/0x563f6e19197A8567778180F66474E30122FD702A'
}
LABELS[1007] = {
  name: 'ICHI oneToken Pool (ICHIBPT)',
  lpName: 'ICHIBNT',
  shortLpName: 'ICHIBNT',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&outputCurrency=0x96855edefc3ad2d9efd0421f301d1324e1e93a52'
}
LABELS[1008] = {
  name: '67/33 ICHI-LINK',
  lpName: 'BPT (Balancer Pool Token) ICHI-LINK',
  shortLpName: 'BPT ICHI-LINK',
  tradeUrl: 'https://pools.balancer.exchange/#/pool/0x960c437E2A9A9a25e0FEDC0C8A5899827B10F63c'
}

export { ADDRESSES, APIS, POOLS, LABELS, TOKENS, CHAIN_ID };
