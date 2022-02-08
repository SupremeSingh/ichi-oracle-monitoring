const CHAIN_ID = 80001;

const ADDRESSES = {
  //farming_V2: "0xCfF363294b876F27dF7aCe9584B243177bF618af",
  //ETH: "0x0000000000000000000000000000000000000000",
};

const APIS = {
}

const POOLS = {
  activePools : [],
  depositPools : [],
  activeVaults: [],
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
      address: '',
      farm: 0,
      ichi: ''
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
  mum_token6: { 
    address: "0x13EDD87281803AF4178E7b30631ab7Cbb6819441",
    decimals: 6,
    displayName: "Token6",
    isOneToken: false
  }
}

const LABELS = {}
/*LABELS[5000] = {
  name: 'WEENUS-WETH',
  lpName: 'UNI-V2',
  shortLpName: 'UNI-V2'
}*/
/*LABELS[5005] = {
  name: 'oneUNI Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x8290d7a64f25e6b5002d98367e8367c1b532b534',
}*/
/*LABELS[20000] = {
  name: 'oneUNI-UNI Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  farmAddress: '0x393A4c7F8D8aE114728C03C26bd08468C8b7f6c7',
  farmId: 0,
  farmRewardTokenName: 'UNI',
  farmRewardTokenDecimals: 18,
  farmRewardTokenAddress: '0xdF2661E2E6A35B482E3F105bDE628B5e1F68aB41',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x8290d7a64f25e6b5002d98367e8367c1b532b534',
}*/

export { ADDRESSES, APIS, POOLS, LABELS, TOKENS, CHAIN_ID };
