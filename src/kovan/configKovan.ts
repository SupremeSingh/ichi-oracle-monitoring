const CHAIN_ID = 42;

const ADDRESSES = {
  farming_V2: "0xCfF363294b876F27dF7aCe9584B243177bF618af",
  ETH: "0x0000000000000000000000000000000000000000",
};

const APIS = {
}

const POOLS = {
//  activePools : [5001,5002,5003],
  activePools : [5000, 5001, 5002, 5003],
  depositPools : [5002, 5003],
  activeVaults: [5004, 5005, 20000, 5006],
  upcomingPools : [],
  migratingPools : [],
  retiredPools : [],
  unretiredPools : [5003, 5004, 5005, 5006, 20000]
}

const TOKENS = {
  oti: { 
    address: "0x5BF9b9bB304672c3d006955AbFC516e8b37693F9",
    strategy: "",
    decimals: 18,
    displayName: "OTI",
    isOneToken: true,
    isV2: true,
    stimulusName: 'token18',
    stimulusDisplayName: 'Token18',
    tradeUrl: 'https://app.1inch.io/#/1/dao/farming'
  },
  test_oneuni: { 
    address: "0x4238C45783551be0D848BbAdA853cCa6b265322f",
    strategy: "",
    decimals: 18,
    displayName: "oneUNI",
    isOneToken: true,
    isV2: true,
    ichiVault: { 
      address: '',
      farm: 0,
      ichi: ''
    },
    stimulusName: 'test_uni',
    stimulusDisplayName: 'UNI',
    tradeUrl: ''
  },
  test_onefil: { 
    address: "0x50633E780803b56a0d8606a3C674993080Ea98c1",
    strategy: "0xf2c642b993e98298477f3f20ea2de8e6f29db534",
    decimals: 18,
    displayName: "oneFIL",
    isOneToken: true,
    isV2: true,
    ichiVault: { 
      address: '0xA0D500fd3479CBCb64a2238082b7a1Df9f87d98D',
      farm: 4,
      ichi: 'token1'
    },
    stimulusName: 'test_renfil',
    stimulusDisplayName: 'renFIL',
    tradeUrl: ''
  },
  test_ichi: { 
    address: "0x883Cc74d965edB77311A3f9a93649e92E2aa14ba",
    decimals: 9,
    displayName: "ICHI",
    isOneToken: false
  },
  test_xichi: { 
    address: "0x4a8a50cd18ccd55078630a4b17d16c892ff7f4db",
    decimals: 9,
    displayName: "xICHI",
    isOneToken: false
  },
  test_usdc: { 
    address: "0x21632981cBf52eB788171e8dcB891C32F4834239",
    decimals: 6,
    displayName: "USDC",
    isOneToken: false
  },
  test_uni: { 
    address: "0xdF2661E2E6A35B482E3F105bDE628B5e1F68aB41",
    decimals: 18,
    displayName: "UNI",
    isOneToken: false
  },
  test_renfil: { 
    address: "0x3CB15c7048e7CfAcFBc8eFe9362fAC5e60012BD1",
    decimals: 18,
    displayName: "renFIL",
    isOneToken: false
  },
  weenus: { 
    address: "0xaFF4481D10270F50f203E0763e2597776068CBc5",
    decimals: 18,
    displayName: "WEENUS",
    isOneToken: false
  },
  test_weth: { 
    address: "0xd0A1E359811322d97991E03f863a0C30C2cF029C",
    decimals: 18,
    displayName: "WETH",
    isOneToken: false
  },
  token6: { 
    address: "0xb994c68b4ed03d8f0aa9cb1b1729fa9bbbaa75e7",
    decimals: 6,
    displayName: "Token6",
    isOneToken: false
  },
  token18: { 
    address: "0x670d1C929e7d6B9F847c60A35750A440cB0f9308",
    decimals: 18,
    displayName: "Token18",
    isOneToken: false
  }
}

const LABELS = {}
LABELS[5000] = {
  name: 'WEENUS-WETH',
  lpName: 'UNI-V2',
  shortLpName: 'UNI-V2'
}
LABELS[5001] = {
  name: 'ICHI-WETH',
  lpName: 'UNI-V2',
  shortLpName: 'UNI-V2'
}
LABELS[5002] = {
  name: 'OTI Deposit',
  lpName: 'OTI',
  shortLpName: 'OTI'
}
LABELS[5003] = {
  name: 'oneFIL Deposit',
  lpName: 'oneFIL',
  shortLpName: 'oneFIL'
}
LABELS[5004] = {
  name: 'oneFIL Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x6d82017e55b1d24c53c7b33bbb770a86f2ca229d'
}
LABELS[5005] = {
  name: 'oneUNI Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x8290d7a64f25e6b5002d98367e8367c1b532b534',
}
LABELS[5006] = {
  name: 'Weenus Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x8290d7a64f25e6b5002d98367e8367c1b532b534',
}
LABELS[20000] = {
  name: 'oneUNI-UNI Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  farmAddress: '0x393A4c7F8D8aE114728C03C26bd08468C8b7f6c7',
  farmId: 0,
  farmRewardTokenName: 'UNI',
  farmRewardTokenDecimals: 18,
  farmRewardTokenAddress: '0xdF2661E2E6A35B482E3F105bDE628B5e1F68aB41',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x8290d7a64f25e6b5002d98367e8367c1b532b534',
}

export { ADDRESSES, APIS, POOLS, LABELS, TOKENS, CHAIN_ID };
