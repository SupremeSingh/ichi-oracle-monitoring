const CHAIN_ID = 137;

const ADDRESSES = {
  ETH: "0x0000000000000000000000000000000000000000",
  farming_V2: "0x2fb24195c965B4a0cDfc27DD5C85eC1A46d7A931",
  uniswap_V3_positions: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
};

const POOLS = {
  activePools : [],
  depositPools : [],
  activeVaults: [],
  upcomingPools : [],
  migratingPools : [],
  retiredPools : [],
  unretiredPools : [4000],
  activeAPR: []
}

const TOKENS = {
  pol_ichi: {
    address: "0x111111517e4929D3dcbdfa7CCe55d30d4B6BC4d6",
    decimals: 18,
    displayName: "ICHI",
    isOneToken: false
  },
  pol_usdc: {
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    decimals: 6,
    displayName: "USDC",
    isOneToken: false
  },
  pol_wbtc: {
    address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    decimals: 8,
    displayName: "wBTC",
    isOneToken: false
  },

  pol_onebtc: { 
    address: "0x1f194578e7510A350fb517a9ce63C40Fa1899427",
    strategy: "0x51803f621c5e90011DE58b57fD5b7A92e0e39B08",
    aux_strategy: "",
    decimals: 18,
    displayName: "oneBTC",
    isOneToken: true,
    isV2: true,
    /*ichiVault: { 
      address: '0xfaeCcee632912c42a7c88c3544885A8D455408FA',
      farm: 0,
      externalFarm: '',
      scarceToken: 'token1',
      scarceTokenName: 'pol_ichi',
      scarceTokenDecimals: 18,
    },*/
    stimulusName: 'pol_wbtc',
    stimulusDisplayName: 'wBTC',
    tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  },
}

const LABELS = {};
LABELS[4000] = {
  name: 'oneBTC Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl: 'https://app.uniswap.org/#/swap?inputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&outputCurrency=0x8290d7a64f25e6b5002d98367e8367c1b532b534',
  subgraphEndpoint: '',
  isInverted: false,
  isHodl: false,
  vaultName: 'polygon_onebtc',
  vaultAddress: '0xfaeCcee632912c42a7c88c3544885A8D455408FA',
  irrStartDate: new Date(0),
}

export { ADDRESSES, POOLS, LABELS, TOKENS, CHAIN_ID };
