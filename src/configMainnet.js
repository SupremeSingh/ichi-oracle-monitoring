const ADDRESSES = {
  ICHI_BNT: "0xeb3c6ec035c1907d593332dc171cf997da718433",
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
    isOneToken: false
  },
  BNT: {
    address: "0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C",
    decimals: 18,
    isOneToken: false
  },
  '1inch': {
    address: "0x111111111117dC0aa78b770fA6A738034120C302",
    decimals: 18,
    isOneToken: false
  },
  pWING: {
    address: "0xDb0f18081b505A7DE20B18ac41856BCB4Ba86A1a",
    decimals: 9,
    isOneToken: false
  },
  wBTC: {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    isOneToken: false
  },
  wETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    isOneToken: false
  },
  vBTC: {
    address: "0xe1406825186D63980fd6e2eC61888f7B91C4bAe4",
    decimals: 18,
    isOneToken: false
  },
  link: {
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
    isOneToken: false
  },
  USDC: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    isOneToken: false
  },
  oneETH: { 
    address: "0xEc0d77a58528a218cBf41Fa6E1585c8D7A085868",
    decimals: 9,
    isOneToken: true
  },
  oneBTC: { 
    address: "0xC88F47067dB2E25851317A2FDaE73a22c0777c37",
    decimals: 9,
    isOneToken: true
  },
  oneVBTC: { 
    address: "0x7BD198b9107496fD5cC3d7655AF52f43a8eDBc4C",
    decimals: 9,
    isOneToken: true
  },
  oneWING: { 
    address: "0x8F041A3940a5e6FB580075C3774E15FcFA0E1618",
    decimals: 9,
    isOneToken: true
  },
  oneLINK: { 
    address: "0x18Cc17a1EeD37C02A77B0B96b7890C7730E2a2CF",
    decimals: 9,
    isOneToken: true
  }
}

const POOLS = {
  activePools : [8, 9, 10, 12, 13, 19, 1001, 1003, 1004, 1005, 1006, 1007, 1008, 10001, 10002],
  //activePools : [8, 1006, 1007, 10001, 10002],
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
  shortLpName: 'SLP OneBTC-WBTC'
}
LABELS[9] = {
  name: 'oneLINK-LINK',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneLINK-LINK',
  shortLpName: 'OneLINK-LINK'
}
LABELS[10] = {
  name: 'ICHI-ETH',
  lpName: 'SLP (Sushiswap Liquidity Pool) ICHI-ETH',
  shortLpName: 'SLP ICHI-ETH'
}
LABELS[12] = {
  name: 'oneETH-USDC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneETH-USDC',
  shortLpName: 'SLP OneETH-USDC'
}
LABELS[13] = {
  name: 'oneWING-USDC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneWING-USDC',
  shortLpName: 'SLP OneWING-USDC'
}
LABELS[19] = {
  name: 'oneVBTC-vBTC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneVBTC-vBTC',
  shortLpName: 'OneVBTC-vBTC'
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
  shortLpName: 'BPT ICHI-ETH'
}
LABELS[1003] = {
  name: 'Smart ICHI-ETH',
  lpName: 'ICHI_ETH_SBPT',
  shortLpName: 'ICHI_ETH_SBPT'
}
LABELS[1004] = {
  name: 'ICHI-ETH',
  lpName: 'SLP (Sushiswap Liquidity Pool) ICHI-ETH',
  shortLpName: 'SLP ICHI-ETH'
}
LABELS[1005] = {
  name: 'ICHI-ETH',
  lpName: 'UNI-V2 ICHI-ETH',
  shortLpName: 'UNI-V2 ICHI-ETH'
}
LABELS[1006] = {
  name: 'ICHI-BNT',
  lpName: 'ICHIBNT',
  shortLpName: 'ICHIBNT'
}
LABELS[1007] = {
  name: 'ICHI oneToken Pool (ICHIBPT)',
  lpName: 'ICHIBNT',
  shortLpName: 'ICHIBNT'
}
LABELS[1008] = {
  name: '67/33 ICHI-LINK',
  lpName: 'BPT (Balancer Pool Token) ICHI-LINK',
  shortLpName: 'BPT ICHI-LINK'
}

module.exports = { ADDRESSES, APIS, POOLS, LABELS, TOKENS };
