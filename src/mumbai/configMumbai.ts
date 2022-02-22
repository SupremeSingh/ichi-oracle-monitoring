const CHAIN_ID = 80001;

const ADDRESSES = {
  farming_V2: "0x9c1c486d007B65D5cbaE45811a41E540d304ac9D",
  ETH: "0x0000000000000000000000000000000000000000",
};

const APIS = {
}

const POOLS = {
  activePools : [],
  depositPools : [],
  activeVaults: [6000],
  upcomingPools : [],
  migratingPools : [],
  retiredPools : []
}

const TOKENS = {
  mum_onebtc: { 
    address: "0xeE0de02B5aFb77aD8718bA6C24A93fF3ea4e5637",
    strategy: "",
    decimals: 18,
    displayName: "oneBTC",
    isOneToken: true,
    isV2: true,
    ichiVault: { 
      address: '0xA3a17a728534Dc72A9865469C292C0b7D055D97d',
      farm: 0,
      externalFarm: '',
      scarceToken: 'token0',
      scarceTokenName: 'mum_ichi',
      scarceTokenDecimals: 18,
      //graphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/wing-vault'
    },
    stimulusName: 'mum_token6',
    stimulusDisplayName: 'Token6',
    tradeUrl: ''
  },
  mum_usdc: { 
    address: "0x0FA8781a83E46826621b3BC094Ea2A0212e71B23",
    decimals: 6,
    displayName: "USDC",
    isOneToken: false
  },
  mum_ichi: { 
    address: "0x36D7A88Df8B44D966DaC25c0DB0C000AE4d2306a",
    decimals: 18,
    displayName: "ICHI",
    isOneToken: false
  },
  mum_token6: { 
    address: "0x13EDD87281803AF4178E7b30631ab7Cbb6819441",
    decimals: 6,
    displayName: "Token6",
    isOneToken: false
  }
}

const LABELS = {}
LABELS[6000] = {
  name: 'oneBTC-ICHI Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x8290d7a64f25e6b5002d98367e8367c1b532b534',
  //subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/ichi-org/ichi-vault',
  isInverted: false,
  vaultName: 'onebtc',
  vaultAddress: '0xA3a17a728534Dc72A9865469C292C0b7D055D97d'
}

export { ADDRESSES, APIS, POOLS, LABELS, TOKENS, CHAIN_ID };
