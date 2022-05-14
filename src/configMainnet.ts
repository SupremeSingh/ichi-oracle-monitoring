const CHAIN_ID = 1;
const BLOCKS_PER_DAY = 6500;

const ADDRESSES = {
  // to look for BNT Converter addresses use this contract: 0xC0205e203F423Bcd8B2a4d6f8C8A154b0Aa60F19
  ICHI_BNT: "0x4a2F0Ca5E03B2cF81AebD936328CF2085037b63B",
  ICHIBPT: "0x96855eDEfC3Ad2d9eFD0421F301d1324e1e93a52",
  ETH: "0x0000000000000000000000000000000000000000",
  ALLY: "0x1aa1e61369874bae3444A8Ef6528d6b13D6952EF",
  farming_V1: "0xcC50953A743B9CE382f423E37b07Efa6F9d9B000",
  farming_V2: "0x275dFE03bc036257Cd0a713EE819Dbd4529739c8",
  ichi_community_gnosis: "0x8f3c97DdC88D7A75b8c3f872b525B30932D3014c",
  uniswap_V3_positions: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  _1inch_ICHI_LP: "0x1dcE26F543E591c27717e25294AEbbF59AD9f3a5",
  _1inch_staking: "0x0F85A912448279111694F4Ba4F85dC641c54b594",
  st1inch: "0xA0446D8804611944F1B527eCD37d7dcbE442caba",
  bmi_staking: "0x6771Fd8968488Eb590Dff1730FE099c0eFA415bF",
  // risk_harbor: "0x635F549a5502CCF73b97A6df2C3644ed804b250d",
  rari_pool_lens: "0x6Dc585Ad66A10214Ef0502492B0CC02F0e836eec",
  rari_pool_lens_secondary: "0xc76190E04012f26A364228Cfc41690429C44165d",
  rari_oneuni_token: "0x342AC2C024f214a711356F48326614E1d8Dd0420",
  rari_ichi_vault_lp_token: "0x78DcC36DC532b0dEF7b53a56A91610C44DD09444",
  rari_onebtc_vault_lp_token: "0x90313731C407376535ac1bFae14D45C7f964edeE",
  rari_comptroller: "0xAbDFCdb1503d89D9a6fFE052a526d7A41f5b76D6",
  rari_oneuni: "0x342AC2C024f214a711356F48326614E1d8Dd0420",
  rari_onebtc: "0x43854261848F67b04a6bf9E6fC757e0F8993fc81",
  rari_usdc: "0xecE2c0aA6291e3f1222B6f056596dfE0E81039b9",
  rari_wbtc: "0x5933F2109652C019CEab70dabf4Bc9E0E29873F5"
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
  subgraph_farming_v2: "https://api.thegraph.com/subgraphs/name/ichi-org/farmv2",
  subgraph_risk_harbor: "https://api.thegraph.com/subgraphs/name/risk-harbor/v2-mainnet"
};

const TREASURIES = {
  treasuries: ['oneBTC', 'oneFIL', 'one1INCH', 'oneFUSE', 'oneMPH', 'onePERL', 'oneUNI', 'oneDODO', 'oneFOX', 'oneWING', 'BOOTusd', 'oneOJA'],
  //treasuries: ['oneWING'],
  legacyTreasuries: ['oneBTC', 'oneDODO', 'oneUNI']
}

const POOLS = {
  activePools : [1001, 1004, 1005, 1009, 1010, 1012, 1013, 1014, 1015, 1017, 1018, 10001, 10003, 10004, 10005, 10009],
  //activePools : [],
  depositPools : [1009, 1010, 1012, 1013, 1014, 1015, 1017, 1018, 10005, 10009],
  activeVaults: [1016, 1019, 1020, 1021, 1022, 20001, 20002, 20003, 20004, 10006, 10008],
  //activeVaults: [],
  underlyingVaults: [1023],
  upcomingPools : [],
  migratingPools : [],
  retiredPools : [],
  unretiredPools : [10001, 10008, 10009, 20001, 20002, 20003, 20004, 1001, 1005, 1019, 1020, 1021, 1022, 1023],
  oneInchPools : [15, 16, 10001],
  balancerPools : [18, 1001, 1002, 1008],
  balancerSmartPools : [1003, 1007],
  bancorPools : [14, 1006, 10003],
  uniPools : [1005],
  loopringPools : [10002],
  dodoPools : [10004, 10007],
  rariAssets : [10005, 10006, 10008, 10009],
  specialPricing: [19],
  legacyPools : [1001, 1009, 1014, 1016, 1017, 10004, 10005, 10006, 10007, 10008, 10009],
  activeAPR: [1016, 1019, 1020, 10006, 10008, 1021, 1022]
  //activeAPR: []
}

const TOKENS = {
  ichi: {
    address: "0x903bEF1736CDdf2A537176cf3C64579C3867A881",
    decimals: 9,
    displayName: "ICHI",
    isOneToken: false
  },
  ichi_v2: {
    address: "0x111111517e4929D3dcbdfa7CCe55d30d4B6BC4d6",
    decimals: 18,
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
  cel: {
    address: "0xaaAEBE6Fe48E54f431b0C390CfaF0b017d09D42d",
    decimals: 4,
    displayName: "CEL",
    isOneToken: false
  },
  gno: {
    address: "0x6810e776880C02933D47DB1b9fc05908e5386b96",
    decimals: 18,
    displayName: "GNO",
    isOneToken: false
  },
  '1inch': {
    address: "0x111111111117dC0aa78b770fA6A738034120C302",
    decimals: 18,
    displayName: "1INCH",
    parentOneToken: "one1inch",
    isOneToken: false
  },
  oja: {
    address: "0x0aA7eFE4945Db24d95cA6E117BBa65Ed326e291A",
    decimals: 18,
    displayName: "OJA",
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
  wnxm: {
    address: "0x0d438F3b5175Bebc262bF23753C1E53d03432bDE",
    decimals: 18,
    displayName: "wNXM",
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
    address: "0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d",
    decimals: 18,
    displayName: "FOX",
    parentOneToken: "onefox",
    isOneToken: false
  },
  boot: {
    address: "0x0337fe811809A0aaf9B5D07945b39E473dE4c46E",
    decimals: 18,
    displayName: "BOOT",
    parentOneToken: "bootusd",
    isOneToken: false
  },

  oneeth: { 
    address: "0xEc0d77a58528a218cBf41Fa6E1585c8D7A085868",
    strategy: "",
    aux_strategy: [],
    decimals: 9,
    displayName: "oneETH",
    isOneToken: true,
    stimulusName: 'weth',
    stimulusDisplayName: 'ETH',
    isV2: false
  },
/*  old_onebtc: { 
    address: "0xC88F47067dB2E25851317A2FDaE73a22c0777c37",
    strategy: "",
    aux_strategy: [],
    decimals: 9,
    displayName: "oneBTC",
    isOneToken: true,
    stimulusName: 'wbtc',
    stimulusDisplayName: 'BTC',
    isV2: false
  },*/
  onevbtc: { 
    address: "0x7BD198b9107496fD5cC3d7655AF52f43a8eDBc4C",
    strategy: "",
    aux_strategy: [],
    decimals: 9,
    displayName: "oneVBTC",
    isOneToken: true,
    stimulusName: 'vbtc',
    stimulusDisplayName: 'VBTC',
    isV2: false
  },
  onelink: { 
    address: "0x18Cc17a1EeD37C02A77B0B96b7890C7730E2a2CF",
    strategy: "",
    aux_strategy: [],
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
    aux_strategy: [],
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
    aux_strategy: [],
    decimals: 18,
    displayName: "one1INCH",
    isOneToken: true,
    isV2: true,
    stimulusName: '1inch',
    stimulusDisplayName: '1INCH',
    tradeUrl: 'https://app.1inch.io/#/1/swap/ETH/1inch'
  },
  onebtc: { 
    address: "0xEc4325F0518584F0774b483c215F65474EAbD27F",
    strategy: "0x435B65196f302b04bAabcc1E5f07CA1192736771",
    aux_strategy: [],
    ally_swap: "0xB973C8BE7d9A5a6dB9B227555C70C8f4De3FB82D",
    decimals: 18,
    displayName: "oneBTC",
    isOneToken: true,
    isV2: true,
    ichiVault: { 
      address: '0x5318c21c96256ce4b73c27D405147df97d28E0Be',
      farm: 0,
      externalFarm: '',
      scarceToken: 'token0',
      scarceTokenName: 'ichi',
      scarceTokenDecimals: 9,
    },
    stimulusName: 'wbtc',
    stimulusDisplayName: 'wBTC',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599&chain=mainnet',
  },
  onefuse: { 
    address: "0xBbcE03B2E7f53caDCA93251CA4c928aF01Db6404",
    strategy: "0x8740C9f316241F905323920F4f4FA8A4d6aB100b",
    aux_strategy: [],
    decimals: 18,
    displayName: "oneFUSE",
    isOneToken: true,
    isV2: true,
    ichiVault: { 
      address: '0x3A4411a33CfeF8BC01f23ED7518208aA38cca824',
      farm: 0,
      externalFarm: '0xBDf32c838e1b5d927B9ecb099b1f01F81d677A30',
      scarceToken: 'token0',
      scarceTokenName: 'fuse',
      scarceTokenDecimals: 18,
    },
    stimulusName: 'fuse',
    stimulusDisplayName: 'FUSE',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d',
  },
  onemph: { 
    address: "0xBE3F88E18BE3944FdDa830695228ADBB82fA125F",
    strategy: "0xF1587Cb51349CDf5bb408845249De36466C35F41",
    aux_strategy: [],
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
    aux_strategy: [],
    decimals: 18,
    displayName: "onePERL",
    isOneToken: true,
    isV2: true,
    stimulusName: 'perl',
    stimulusDisplayName: 'PERL',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xeca82185adCE47f39c684352B0439f030f860318&use=V2',
  },
  oneoja: { 
    address: "0xbB9E5DB6F357BB4dF35E8B90B37b8A3F33031D86",
    strategy: "0x2E76A8D053f839A04235341dF1f25235437fEDd6",
    aux_strategy: [],
    decimals: 18,
    displayName: "oneOJA",
    isOneToken: true,
    isV2: true,
    ichiVault: { 
      address: '0x98bAd5Ce592DcfE706CC95a1B9dB7008B6D418F8',
      farm: 0,
      externalFarm: '0x4C8E041157f3DC06D6Cc5670EdE41aBA881D66e8',
      scarceToken: 'token0',
      scarceTokenName: 'oja',
      scarceTokenDecimals: 18,
    },
    stimulusName: 'oja',
    stimulusDisplayName: 'OJA',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x0aA7eFE4945Db24d95cA6E117BBa65Ed326e291A&use=V2',
  },
  oneuni: { 
    address: "0x8290d7a64f25e6b5002d98367e8367c1b532b534",
    strategy: "0x6287d56e246EEE33beAd2D7DD3a99Db693f4554C",
    aux_strategy: ["0x55922Fa5084f9367B73FC0df9163B089D8Ac4CB7",
                   "0x0b10e483aac4340256772754d23131b6e0dc31ea"],
    ally_swap: "0x9Fd678389480590511302922ccA092482816D564",
    decimals: 18,
    displayName: "oneUNI",
    isOneToken: true,
    isV2: true,
    ichiVault: { 
      address: '0xfaeCcee632912c42a7c88c3544885A8D455408FA',
      farm: 16,
      externalFarm: '',
      scarceToken: 'token1',
      scarceTokenName: 'ichi',
      scarceTokenDecimals: 9,
    },
    stimulusName: 'uni',
    stimulusDisplayName: 'UNI',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  },
  onedodo: { 
    address: "0xcA37530E7c5968627BE470081d1C993eb1dEaf90",
    strategy: "0x1faac4842054F2dB2DdDFC8152D7C259d5102c13",
    aux_strategy: [],
    ally_swap: "0x3f57443040cC438d5d6108Fd024DfBFd048d9503",
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
    aux_strategy: [],
    decimals: 18,
    displayName: "oneFOX",
    isOneToken: true,
    isV2: true,
    ichiVault: { 
      address: '0x779F9BAd1f4B1Ef5198AD9361DBf3791F9e0D596',
      farm: 0,
      externalFarm: '0x81A19b061d6a726b3268FF13cB0f9eb1b6f2DDA5',
      scarceToken: 'token1',
      scarceTokenName: 'fox',
      scarceTokenDecimals: 18,
    },
    stimulusName: 'fox',
    stimulusDisplayName: 'FOX',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
  },
  onewing: { 
    address: "0x5047fc5C9D7c49Ab22e390d13646a6A3a2476eff",
    strategy: "0xac20007A5CBDA40d8E16df26bAD89E8738404691",
    aux_strategy: [],
    decimals: 18,
    displayName: "oneWING",
    isOneToken: true,
    isV2: true,
    ichiVault: { 
      address: '0x2a8E09552782563f7A076ccec0Ff39473B91Cd8F',
      farm: 0,
      externalFarm: '0xa87c231A2311B9484bfC9BF90C51C3181161eCB0',
      scarceToken: 'token1',
      scarceTokenName: 'pwing',
      scarceTokenDecimals: 9,
    },
    stimulusName: 'pwing',
    stimulusDisplayName: 'pWING',
    tradeUrl: 'https://app.sushi.com/swap?inputCurrency=ETH&outputCurrency=0xDb0f18081b505A7DE20B18ac41856BCB4Ba86A1a',
  },
  bootusd: { 
    address: "0x78a3b2f1e7eec1073088ea4a193618743f81cef8",
    strategy: "0x4ed128f3087DB2D9F6Ea0f1dca3b7FC716EC256C",
    aux_strategy: [],
    decimals: 18,
    displayName: "BOOTusd",
    isOneToken: true,
    isV2: true,
    stimulusName: 'boot',
    stimulusDisplayName: 'BOOT',
    tradeUrl: 'https://www.boot.finance',
  },
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
  farmAddress: '0x748F4DFf5996711A3E127aAba2E9B95347cCDc74',
  externalAddress: '0x748F4DFf5996711A3E127aAba2E9B95347cCDc74',
  externalUrl: 'https://app.dodoex.io/earn/add-liquidity?network=mainnet&poolAddress=0x138c825d993d5ffb7f028408e870ebf50a019543',
  externalButton: 'DODO'
}
LABELS[10005] = {
  name: 'oneUNI Deposit',
  lpName: 'oneUNI',
  shortLpName: 'oneUNI',
  farmAddress: ADDRESSES.farming_V2,
  externalUrl: 'https://app.rari.capital/fuse/pool/136',
  externalText: 'Earn $ICHI and $oneUNI',
  externalButton: 'RARI'
}
LABELS[10006] = {
  name: 'oneUNI Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.1inch.io/#/1/swap/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/0x8290D7a64F25e6b5002d98367E8367c1b532b534',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/ichi-vault',
  isInverted: false,
  isHodl: false,
  vaultName: 'ichi',
  vaultAddress: '0xfaeCcee632912c42a7c88c3544885A8D455408FA',
  irrStartDate: new Date(0),
  irrStartTxAmount: 0,
  externalUrl: 'https://app.rari.capital/fuse/pool/136',
  externalText: 'Earn $ICHI',
  externalButton: 'RARI'
}
LABELS[10007] = {
  name: 'oneDODO-USDC',
  lpName: 'DLP',
  shortLpName: 'DLP',
  farmAddress: '0x4be2d9251849DB6d3980cE3E13915980C1AE3065',
  externalAddress: '0x4be2d9251849DB6d3980cE3E13915980C1AE3065',
  externalUrl: 'https://app.dodoex.io/mining?network=bsc-mainnet&address=0x4be2d9251849DB6d3980cE3E13915980C1AE3065',
  externalButton: 'DODO'
}
LABELS[10008] = {
  name: 'oneBTC Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0xEc4325F0518584F0774b483c215F65474EAbD27F&chain=mainnet',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/onebtc-vault',
  isInverted: true,
  isHodl: false,
  vaultName: 'onebtc',
  vaultAddress: '0x5318c21c96256ce4b73c27D405147df97d28E0Be',
  irrStartDate: new Date(0),
  irrStartTxAmount: 0,
  externalUrl: 'https://app.rari.capital/fuse/pool/136',
  externalText: 'Earn $ICHI',
  externalButton: 'RARI'
}
LABELS[10009] = {
  name: 'oneBTC Deposit',
  lpName: 'oneBTC',
  shortLpName: 'oneBTC',
  farmAddress: ADDRESSES.farming_V2,
  externalUrl: 'https://app.rari.capital/fuse/pool/136',
  externalText: 'Earn $ICHI and $oneBTC',
  externalButton: 'RARI'
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
/*LABELS[1011] = {
  name: 'oneFUSE Deposit',
  lpName: 'oneFUSE',
  shortLpName: 'oneFUSE',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0xbbce03b2e7f53cadca93251ca4c928af01db6404'
}*/
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
LABELS[1016] = {
  name: 'oneUNI Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.1inch.io/#/1/swap/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/0x8290D7a64F25e6b5002d98367E8367c1b532b534',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/ichi-vault',
  isInverted: false,
  isHodl: false,
  vaultName: 'ichi',
  vaultAddress: '0xfaeCcee632912c42a7c88c3544885A8D455408FA',
  irrStartDate: new Date(0),
  irrStartTxAmount: 0,
}
LABELS[1017] = {
  name: 'oneDODO Deposit',
  lpName: 'oneDODO',
  shortLpName: 'oneDODO',
  tradeUrl: '/mint?name=onedodo&collateral=USDC'
  // tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x03352D267951E96c6F7235037C5DFD2AB1466232',
}
LABELS[1018] = {
  name: 'oneWING Deposit',
  lpName: 'oneWING',
  shortLpName: 'oneWING',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x5047fc5C9D7c49Ab22e390d13646a6A3a2476eff',
}
LABELS[1019] = {
  name: 'GNO Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x6810e776880C02933D47DB1b9fc05908e5386b96&chain=mainnet',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/gno-vault',
  isInverted: false,
  isHodl: true,
  vaultName: 'gno',
  vaultAddress: '0xA380EA6BE1C084851aE7846a8F39def17eCf6ED8',
  irrStartDate: new Date('2022-03-10T14:25:23'),
  irrStartTxAmount: 17916,
}
LABELS[1020] = {
  name: 'CEL Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0xaaAEBE6Fe48E54f431b0C390CfaF0b017d09D42d&chain=mainnet',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/cel-vault',
  isInverted: true,
  isHodl: true,
  vaultName: 'cel',
  vaultAddress: '0x82FF3E2eC3bDCa84CF0637402907e26C51d1d676',
  irrStartDate: new Date('2022-03-23T00:13:17'),
  irrStartTxAmount: 346101.2345,
}
LABELS[1021] = {
  name: 'wNXM Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x0d438f3b5175bebc262bf23753c1e53d03432bde&chain=mainnet',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/wnxm-vault',
  isInverted: false,
  isHodl: true,
  vaultName: 'wnxm',
  vaultAddress: '0xd3FeD75d934Ab824Ff7FEcd0f8A70f204e61769b',
  irrStartDate: new Date('2022-03-15T19:04:48'),
  irrStartTxAmount: 222193,
}
LABELS[1022] = {
  name: 'wBTC Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599&chain=mainnet',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/wbtc-vault',
  isInverted: false,
  isHodl: true,
  vaultName: 'wbtc',
  vaultAddress: '0xeF88913c674a9cA1E79b3986e4b222F3E75c7d05',
  irrStartDate: new Date('2022-03-30T18:17:57'),
  irrStartTxAmount: 75.482852739,
}
LABELS[20001] = {
  name: 'oneFUSE Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  farmAddress: '0xBDf32c838e1b5d927B9ecb099b1f01F81d677A30',
  farmId: 0,
  farmRewardTokenName: 'FUSE',
  farmRewardTokenDecimals: 18,
  farmRewardTokenAddress: '0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0xbbce03b2e7f53cadca93251ca4c928af01db6404',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/fuse-vault',
  isInverted: true,
  isHodl: false,
  vaultName: 'fuse',
  vaultAddress: '0x3A4411a33CfeF8BC01f23ED7518208aA38cca824',
  irrStartDate: new Date(0),
  irrStartTxAmount: 0,
}
LABELS[20002] = {
  name: 'oneWING Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  farmAddress: '0xa87c231A2311B9484bfC9BF90C51C3181161eCB0',
  farmId: 0,
  farmRewardTokenName: 'pWING',
  farmRewardTokenDecimals: 9,
  farmRewardTokenAddress: '0xDb0f18081b505A7DE20B18ac41856BCB4Ba86A1a',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x5047fc5C9D7c49Ab22e390d13646a6A3a2476eff',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/wing-vault',
  isInverted: false,
  isHodl: false,
  vaultName: 'wing',
  vaultAddress: '0x2a8E09552782563f7A076ccec0Ff39473B91Cd8F',
  irrStartDate: new Date(0),
  irrStartTxAmount: 0,
}
LABELS[20003] = {
  name: 'oneFOX Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  farmAddress: '0x81A19b061d6a726b3268FF13cB0f9eb1b6f2DDA5',
  farmId: 0,
  farmRewardTokenName: 'FOX',
  farmRewardTokenDecimals: 18,
  farmRewardTokenAddress: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x03352D267951E96c6F7235037C5DFD2AB1466232',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/fox-vault',
  isInverted: false,
  isHodl: false,
  vaultName: 'fox',
  vaultAddress: '0x779F9BAd1f4B1Ef5198AD9361DBf3791F9e0D596',
  irrStartDate: new Date('2022-03-09T02:00:00'),
  irrStartTxAmount: 0,
}
LABELS[20004] = {
  name: 'oneOJA Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  farmAddress: '0x4C8E041157f3DC06D6Cc5670EdE41aBA881D66e8',
  farmId: 0,
  farmRewardTokenName: 'OJA',
  farmRewardTokenDecimals: 18,
  farmRewardTokenAddress: '0x0aA7eFE4945Db24d95cA6E117BBa65Ed326e291A',
  tradeUrl: '/mint?name=oneoja&collateral=USDC',
  subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/oja-vault',
  isInverted: true,
  isHodl: false,
  vaultName: 'oja',
  vaultAddress: '0x98bAd5Ce592DcfE706CC95a1B9dB7008B6D418F8',
  irrStartDate: new Date(0),
  irrStartTxAmount: 0,
}

export { ADDRESSES, APIS, POOLS, TREASURIES, LABELS, TOKENS, CHAIN_ID, DEBUNK_PROTOCOLS, BLOCKS_PER_DAY };
