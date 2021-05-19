const configKovan = {
  farming_V2: "0xCfF363294b876F27dF7aCe9584B243177bF618af",
  WEENUS: "0xaFF4481D10270F50f203E0763e2597776068CBc5",
  TEST_ICHI: "0x9b5795db93d4c3cc727b5efdaa78f8ec5feb1af2"
};

const configMainnet = {
  etherscanAPI: "2T21NRQVRKS7RHZG16K5X82FAQE8E4EPR7",
  ichi: "0x903bef1736cddf2a537176cf3c64579c3867a881",
  oneETH: "0xEc0d77a58528a218cBf41Fa6E1585c8D7A085868",
  oneBTC: "0xC88F47067dB2E25851317A2FDaE73a22c0777c37",
  oneVBTC: "0x7BD198b9107496fD5cC3d7655AF52f43a8eDBc4C",
  oneWING: "0x8F041A3940a5e6FB580075C3774E15FcFA0E1618",
  oneLINK: "0x18Cc17a1EeD37C02A77B0B96b7890C7730E2a2CF",
  pWING: "0xdb0f18081b505a7de20b18ac41856bcb4ba86a1a",
  wBTC: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
  vBTC: "0xe1406825186D63980fd6e2eC61888f7B91C4bAe4",
  wETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  link: "0x514910771af9ca656af840dff83e8264ecf986ca",
  USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  ICHI_BNT: "0xeb3c6ec035c1907d593332dc171cf997da718433",
  ICHIBPT: "0x96855eDEfC3Ad2d9eFD0421F301d1324e1e93a52",
  ETH: "0x0000000000000000000000000000000000000000",
  farming_V1: "0xcC50953A743B9CE382f423E37b07Efa6F9d9B000",
  farming_V2: "0x275dFE03bc036257Cd0a713EE819Dbd4529739c8",
  loopringAPI: "https://api3.loopring.io/api/v3/poolsStats",
  _1inchPoolAPI: "https://governance.1inch.exchange/v1.1/farming/pools",
  _1inch_ICHI_LP: "0x1dcE26F543E591c27717e25294AEbbF59AD9f3a5",
};

const tokens = {
  ichi: {
    address: "0x903bEF1736CDdf2A537176cf3C64579C3867A881",
    decimals: 9,
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

const pools = {
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

const labels = {};
labels[8] = {
  name: 'oneBTC-wBTC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneBTC-WBTC',
  shortLpName: 'SLP OneBTC-WBTC'
}
labels[9] = {
  name: 'oneLINK-LINK',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneLINK-LINK',
  shortLpName: 'OneLINK-LINK'
}
labels[10] = {
  name: 'ICHI-ETH',
  lpName: 'SLP (Sushiswap Liquidity Pool) ICHI-ETH',
  shortLpName: 'SLP ICHI-ETH'
}
labels[12] = {
  name: 'oneETH-USDC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneETH-USDC',
  shortLpName: 'SLP OneETH-USDC'
}
labels[13] = {
  name: 'oneWING-USDC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneWING-USDC',
  shortLpName: 'SLP OneWING-USDC'
}
labels[19] = {
  name: 'oneVBTC-vBTC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneVBTC-vBTC',
  shortLpName: 'OneVBTC-vBTC'
}
labels[10001] = {
  name: 'ICHI-1inch',
  lpName: '1LP-1INCH-ICHI',
  shortLpName: '1LP-1INCH-ICHI',
  externalUrl: 'https://app.1inch.io/#/1/dao/farming',
  externalText: 'Earn $ICHI & $1INCH',
  externalButton: '1INCH'
}
labels[10002] = {
  name: 'ICHI-ETH',
  lpName: '1LP-1INCH-ICHI',
  shortLpName: '1LP-1INCH-ICHI',
  externalUrl: 'https://exchange.loopring.io/pool',
  externalText: 'Earn $ICHI',
  externalButton: 'Loopring'
}
labels[1001] = {
  name: '80/20 ICHI-ETH',
  lpName: 'BPT (Balancer Pool Token) ICHI-ETH',
  shortLpName: 'BPT ICHI-ETH'
}
labels[1003] = {
  name: 'Smart ICHI-ETH',
  lpName: 'ICHI_ETH_SBPT',
  shortLpName: 'ICHI_ETH_SBPT'
}
labels[1004] = {
  name: 'ICHI-ETH',
  lpName: 'SLP (Sushiswap Liquidity Pool) ICHI-ETH',
  shortLpName: 'SLP ICHI-ETH'
}
labels[1005] = {
  name: 'ICHI-ETH',
  lpName: 'UNI-V2 ICHI-ETH',
  shortLpName: 'UNI-V2 ICHI-ETH'
}
labels[1006] = {
  name: 'ICHI-BNT',
  lpName: 'ICHIBNT',
  shortLpName: 'ICHIBNT'
}
labels[1007] = {
  name: 'ICHI oneToken Pool (ICHIBPT)',
  lpName: 'ICHIBNT',
  shortLpName: 'ICHIBNT'
}
labels[1008] = {
  name: '67/33 ICHI-LINK',
  lpName: 'BPT (Balancer Pool Token) ICHI-LINK',
  shortLpName: 'BPT ICHI-LINK'
}

module.exports = { configMainnet, configKovan, pools, labels, tokens };
