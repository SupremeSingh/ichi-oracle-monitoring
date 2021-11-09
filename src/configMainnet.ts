const CHAIN_ID = 1;

const ADDRESSES = {
  // to look for BNT Converter addresses use this contract: 0xC0205e203F423Bcd8B2a4d6f8C8A154b0Aa60F19
  ICHI_BNT: "0x4a2F0Ca5E03B2cF81AebD936328CF2085037b63B",
  ICHIBPT: "0x96855eDEfC3Ad2d9eFD0421F301d1324e1e93a52",
  ETH: "0x0000000000000000000000000000000000000000",
  farming_V1: "0xcC50953A743B9CE382f423E37b07Efa6F9d9B000",
  farming_V2: "0x275dFE03bc036257Cd0a713EE819Dbd4529739c8",
  uniswap_V3_positions: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  _1inch_ICHI_LP: "0x1dcE26F543E591c27717e25294AEbbF59AD9f3a5",
  _1inch_staking: "0x0F85A912448279111694F4Ba4F85dC641c54b594",
  st1inch: "0xA0446D8804611944F1B527eCD37d7dcbE442caba",
  bmi_staking: "0x6771Fd8968488Eb590Dff1730FE099c0eFA415bF",
  risk_harbor: "0x39c9c00B3651767A7BFdCE3Fd3d714C937E07587"
};

const DEBUNK_PROTOCOLS = {
  UNI_V3: "uniswap3",
  YEARN_V2: "yearn2"
};

const APIS = {
  etherscanAPI: "2T21NRQVRKS7RHZG16K5X82FAQE8E4EPR7",
  loopringAPI: "https://api3.loopring.io/api/v3/poolsStats",
  debunk_openapi: "https://openapi.debank.com/v1/user/protocol",
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
  renfil: {
    address: "0xD5147bc8e386d91Cc5DBE72099DAC6C9b99276F5",
    decimals: 18,
    displayName: "renFIL",
    parentOneToken: "onefil",
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
    parentOneToken: "one1inch",
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
    decimals: 18,
    displayName: "UNI",
    isOneToken: false
  },
  usdc: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    displayName: "USDC",
    isOneToken: false
  },
  fuse: {
    address: "0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d",
    decimals: 18,
    displayName: "FUSE",
    parentOneToken: "onefuse",
    isOneToken: false
  },
  mph: {
    address: "0x8888801aF4d980682e47f1A9036e589479e835C5",
    decimals: 18,
    displayName: "MPH",
    parentOneToken: "onemph",
    isOneToken: false
  },
  perl: {
    address: "0xeca82185adCE47f39c684352B0439f030f860318",
    decimals: 18,
    displayName: "PERL",
    parentOneToken: "oneperl",
    isOneToken: false
  },
  dodo: {
    address: "0x43Dfc4159D86F3A37A5A4B3D4580b888ad7d4DDd",
    decimals: 18,
    displayName: "DODO",
    parentOneToken: "onedodo",
    isOneToken: false
  },
  fox: {
    address: "0x43Dfc4159D86F3A37A5A4B3D4580b888ad7d4DDd",
    decimals: 18,
    displayName: "FOX",
    parentOneToken: "onefox",
    isOneToken: false
  },

  oneeth: { 
    address: "0xEc0d77a58528a218cBf41Fa6E1585c8D7A085868",
    strategy: "",
    aux_strategy: "",
    decimals: 9,
    displayName: "oneETH",
    isOneToken: true,
    stimulusName: 'weth',
    stimulusDisplayName: 'ETH',
    isV2: false
  },
  onebtc: { 
    address: "0xC88F47067dB2E25851317A2FDaE73a22c0777c37",
    strategy: "",
    aux_strategy: "",
    decimals: 9,
    displayName: "oneBTC",
    isOneToken: true,
    stimulusName: 'wbtc',
    stimulusDisplayName: 'BTC',
    isV2: false
  },
  onevbtc: { 
    address: "0x7BD198b9107496fD5cC3d7655AF52f43a8eDBc4C",
    strategy: "",
    aux_strategy: "",
    decimals: 9,
    displayName: "oneVBTC",
    isOneToken: true,
    stimulusName: 'vbtc',
    stimulusDisplayName: 'VBTC',
    isV2: false
  },
  onewing: { 
    address: "0x8F041A3940a5e6FB580075C3774E15FcFA0E1618",
    strategy: "",
    aux_strategy: "",
    decimals: 9,
    displayName: "oneWING",
    isOneToken: true,
    stimulusName: 'pwing',
    stimulusDisplayName: 'WING',
    isV2: false
  },
  onelink: { 
    address: "0x18Cc17a1EeD37C02A77B0B96b7890C7730E2a2CF",
    strategy: "",
    aux_strategy: "",
    decimals: 9,
    displayName: "oneLINK",
    isOneToken: true,
    stimulusName: 'link',
    stimulusDisplayName: 'LINK',
    isV2: false
  },
  onefil: { 
    address: "0x6d82017e55b1D24C53c7B33BbB770A86f2ca229D",
    strategy: "0xc9682298cd1C39145EB34614a0B4356c7F29c92e",
    aux_strategy: "",
    decimals: 18,
    displayName: "oneFIL",
    isOneToken: true,
    isV2: true,
    stimulusName: 'renfil',
    stimulusDisplayName: 'renFIL',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xd5147bc8e386d91cc5dbe72099dac6c9b99276f5'
  },
  one1inch: { 
    address: "0x853bb55c1f469902f088a629db8c8803a9be3857",
    strategy: "0x97B380Ae50160E400d68c92ABeAf24402C9CaA62",
    aux_strategy: "",
    decimals: 18,
    displayName: "one1INCH",
    isOneToken: true,
    isV2: true,
    stimulusName: '1inch',
    stimulusDisplayName: '1INCH',
    tradeUrl: 'https://app.1inch.io/#/1/swap/ETH/1inch'
  },
  onefuse: { 
    address: "0xBbcE03B2E7f53caDCA93251CA4c928aF01Db6404",
    strategy: "0x8740C9f316241F905323920F4f4FA8A4d6aB100b",
    aux_strategy: "",
    decimals: 18,
    displayName: "oneFUSE",
    isOneToken: true,
    isV2: true,
    stimulusName: 'fuse',
    stimulusDisplayName: 'FUSE',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d',
  },
  onemph: { 
    address: "0xBE3F88E18BE3944FdDa830695228ADBB82fA125F",
    strategy: "0xF1587Cb51349CDf5bb408845249De36466C35F41",
    aux_strategy: "",
    decimals: 18,
    displayName: "oneMPH",
    isOneToken: true,
    isV2: true,
    stimulusName: 'mph',
    stimulusDisplayName: 'MPH',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x8888801aF4d980682e47f1A9036e589479e835C5',
  },
  oneperl: { 
    address: "0xD9A24485e71B9148e0Fd51F0162072099DF0dB67",
    strategy: "0x2Dfb5348CC20218426e566C1bD7B8b3789CBa9d5",
    aux_strategy: "",
    decimals: 18,
    displayName: "onePERL",
    isOneToken: true,
    isV2: true,
    stimulusName: 'perl',
    stimulusDisplayName: 'PERL',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xeca82185adCE47f39c684352B0439f030f860318&use=V2',
  },
  oneuni: { 
    address: "0x8290d7a64f25e6b5002d98367e8367c1b532b534",
    strategy: "0x6287d56e246EEE33beAd2D7DD3a99Db693f4554C",
    aux_strategy: "0x55922Fa5084f9367B73FC0df9163B089D8Ac4CB7",
    decimals: 18,
    displayName: "oneUNI",
    isOneToken: true,
    isV2: true,
    stimulusName: 'uni',
    stimulusDisplayName: 'UNI',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  },
  onedodo: { 
    address: "0xcA37530E7c5968627BE470081d1C993eb1dEaf90",
    strategy: "0x1faac4842054F2dB2DdDFC8152D7C259d5102c13",
    aux_strategy: "",
    decimals: 18,
    displayName: "oneDODO",
    isOneToken: true,
    isV2: true,
    stimulusName: 'dodo',
    stimulusDisplayName: 'DODO',
    tradeUrl: 'https://app.dodoex.io/exchange/USDC-DODO?network=mainnet',
  },
  onefox: { 
    address: "0x03352D267951E96c6F7235037C5DFD2AB1466232",
    strategy: "0xeB370EE6927e4655a463F898fFF30479b34708f6",
    aux_strategy: "",
    decimals: 18,
    displayName: "oneFOX",
    isOneToken: true,
    isV2: true,
    stimulusName: 'fox',
    stimulusDisplayName: 'FOX',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
  }
}

const POOLS = {
  activePools : [1001, 1004, 1005, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 10001, 10003, 10004],
  // activePools : [1015],
  depositPools : [1009, 1010, 1011, 1012, 1013, 1014, 1015],
  activeVaults: [],
  upcomingPools : [],
  migratingPools : [],
  retiredPools : [],
  oneInchPools : [15, 16, 10001],
  balancerPools : [18, 1001, 1002, 1008],
  balancerSmartPools : [1003, 1007],
  bancorPools : [14, 1006, 10003],
  uniPools : [1005],
  loopringPools : [10002],
  dodoPools : [10004],
  specialPricing : [19]
}

const LABELS = {};
/* LABELS[8] = {
  name: 'oneBTC-wBTC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneBTC-WBTC',
  shortLpName: 'SLP OneBTC-WBTC',
  tradeUrl: 'https://app.sushi.com/add/0xC88F47067dB2E25851317A2FDaE73a22c0777c37/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
} */
/* LABELS[9] = {
  name: 'oneLINK-LINK',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneLINK-LINK',
  shortLpName: 'OneLINK-LINK',
  tradeUrl: 'https://app.sushi.com/add/0x18Cc17a1EeD37C02A77B0B96b7890C7730E2a2CF/0x514910771af9ca656af840dff83e8264ecf986ca'
} */
/* LABELS[10] = {
  name: 'ICHI-ETH',
  lpName: 'SLP (Sushiswap Liquidity Pool) ICHI-ETH',
  shortLpName: 'SLP ICHI-ETH',
  tradeUrl: 'https://app.sushi.com/add/0x903bEF1736CDdf2A537176cf3C64579C3867A881/ETH'
} */
/* LABELS[12] = {
  name: 'oneETH-USDC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneETH-USDC',
  shortLpName: 'SLP OneETH-USDC',
  tradeUrl: 'https://app.sushi.com/add/0xec0d77a58528a218cbf41fa6e1585c8d7a085868/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
} */
/* LABELS[13] = {
  name: 'oneWING-USDC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneWING-USDC',
  shortLpName: 'SLP OneWING-USDC',
  tradeUrl: 'https://app.sushi.com/add/0x8F041A3940a5e6FB580075C3774E15FcFA0E1618/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
} */
/* LABELS[19] = {
  name: 'oneVBTC-vBTC',
  lpName: 'SLP (Sushiswap Liquidity Pool) OneVBTC-vBTC',
  shortLpName: 'OneVBTC-vBTC',
  tradeUrl: 'https://app.sushi.com/add/0x7BD198b9107496fD5cC3d7655AF52f43a8eDBc4C/0xe1406825186D63980fd6e2eC61888f7B91C4bAe4'
} */
LABELS[10001] = {
  name: 'ICHI-1inch',
  lpName: '1LP-1INCH-ICHI',
  shortLpName: '1LP-1INCH-ICHI',
  externalUrl: 'https://app.1inch.io/#/1/dao/farming',
  externalText: 'Earn $ICHI & $1INCH',
  externalButton: '1INCH'
}
/* LABELS[10002] = {
  name: 'ICHI-ETH',
  lpName: '1LP-1INCH-ICHI',
  shortLpName: '1LP-1INCH-ICHI',
  externalUrl: 'https://exchange.loopring.io/pool',
  externalText: 'Earn $ICHI',
  externalButton: 'Loopring'
} */
LABELS[10003] = {
  name: 'ICHI-BNT',
  lpName: 'ICHI',
  shortLpName: 'ICHI',
  tradeUrl: 'https://app.bancor.network/eth/portfolio/stake/add/single/0x563f6e19197A8567778180F66474E30122FD702A',
  externalUrl: 'https://app.bancor.network/eth/portfolio',
  externalText: 'Earn xICHI',
  externalButton: 'Earn'
}
LABELS[10004] = {
  name: 'oneDODO-USDC',
  lpName: 'DLP',
  shortLpName: 'DLP',
  externalAddress: '0xf9B8500b5012c059f30daA734d3A7131d668b1cd',
  externalUrl: 'https://app.dodoex.io/mining?network=mainnet&address=0xaa89cab926dcd65b3779aa98d9342fd9a21e5d1c',
  externalButton: 'DODO'
}
LABELS[1001] = {
  name: '80/20 ICHI-ETH',
  lpName: 'BPT (Balancer Pool Token) ICHI-ETH',
  shortLpName: 'BPT ICHI-ETH',
  tradeUrl: 'https://pools.balancer.exchange/#/pool/0x58378f5F8Ca85144ebD8e1E5e2ad95B02D29d2BB'
}
/* LABELS[1003] = {
  name: 'Smart ICHI-ETH',
  lpName: 'ICHI_ETH_SBPT',
  shortLpName: 'ICHI_ETH_SBPT',
  tradeUrl: 'https://pools.balancer.exchange/#/pool/0x6dB2d9841b3Fe166F258221c5502dc6Eb465b38D'
} */
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
/* LABELS[1006] = {
  name: 'ICHI-BNT',
  lpName: 'ICHIBNT',
  shortLpName: 'ICHIBNT',
  tradeUrl: 'https://app.bancor.network/eth/pool/add/0x563f6e19197A8567778180F66474E30122FD702A'
} */
/* LABELS[1007] = {
  name: 'ICHI oneToken Pool (ICHIBPT)',
  lpName: 'ICHIBNT',
  shortLpName: 'ICHIBNT',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&outputCurrency=0x96855edefc3ad2d9efd0421f301d1324e1e93a52'
} */
/* LABELS[1008] = {
  name: '67/33 ICHI-LINK',
  lpName: 'BPT (Balancer Pool Token) ICHI-LINK',
  shortLpName: 'BPT ICHI-LINK',
  tradeUrl: 'https://pools.balancer.exchange/#/pool/0x960c437E2A9A9a25e0FEDC0C8A5899827B10F63c'
} */
LABELS[1009] = {
  name: 'oneFIL Deposit',
  lpName: 'oneFIL',
  shortLpName: 'oneFIL',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x6d82017e55b1d24c53c7b33bbb770a86f2ca229d'
}
LABELS[1010] = {
  name: 'one1INCH Deposit',
  lpName: 'one1INCH',
  shortLpName: 'one1INCH',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x853Bb55c1f469902F088A629db8C8803A9BE3857'
}
LABELS[1011] = {
  name: 'oneFUSE Deposit',
  lpName: 'oneFUSE',
  shortLpName: 'oneFUSE',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0xbbce03b2e7f53cadca93251ca4c928af01db6404'
}
LABELS[1012] = {
  name: 'oneMPH Deposit',
  lpName: 'oneMPH',
  shortLpName: 'oneMPH',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0xBE3F88E18BE3944FdDa830695228ADBB82fA125F'
}
LABELS[1013] = {
  name: 'onePERL Deposit',
  lpName: 'onePERL',
  shortLpName: 'onePERL',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0xD9A24485e71B9148e0Fd51F0162072099DF0dB67',
}
LABELS[1014] = {
  name: 'oneUNI Deposit',
  lpName: 'oneUNI',
  shortLpName: 'oneUNI',
  // launchDate: 1625245200000,
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x8290d7a64f25e6b5002d98367e8367c1b532b534',
}
LABELS[1015] = {
  name: 'oneFOX Deposit',
  lpName: 'oneFOX',
  shortLpName: 'oneFOX',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x03352D267951E96c6F7235037C5DFD2AB1466232',
}

export { ADDRESSES, APIS, POOLS, LABELS, TOKENS, CHAIN_ID, DEBUNK_PROTOCOLS };
