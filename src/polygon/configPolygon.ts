const CHAIN_ID = 137;
const BLOCKS_PER_DAY = 43000;

const DEBUNK_PROTOCOLS = {
  UNI_V3: 'matic_uniswap3',
};

const ADDRESSES = {
  ETH: '0x0000000000000000000000000000000000000000',
  farming_V2: '0x2fb24195c965B4a0cDfc27DD5C85eC1A46d7A931',
  uniswap_V3_positions: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
};

const APIS = {
  subgraph_v1_polygon: 'https://api.thegraph.com/subgraphs/name/ichi-org/polygon-v1'
};

const POOLS = {
  activePools: [],
  depositPools: [],
  activeVaults: [4000, 4001, 4002],
  upcomingPools: [],
  migratingPools: [],
  retiredPools: [],
  unretiredPools: [4000, 4001, 4002],
  activeAPR: [4000, 4001, 4002]
};

const TOKENS = {
  pol_ichi: {
    address: '0x111111517e4929D3dcbdfa7CCe55d30d4B6BC4d6',
    decimals: 18,
    displayName: 'ICHI',
    isOneToken: false
  },
  pol_usdc: {
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    decimals: 6,
    displayName: 'USDC',
    isOneToken: false
  },
  pol_wbtc: {
    address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    decimals: 8,
    displayName: 'wBTC',
    isOneToken: false
  },

  pol_onebtc: {
    address: '0x1f194578e7510A350fb517a9ce63C40Fa1899427',
    strategy: '0x51803f621c5e90011DE58b57fD5b7A92e0e39B08',
    aux_strategy: [],
    decimals: 18,
    displayName: 'oneBTC',
    isOneToken: true,
    isV2: true,
    ichiVault: {
      address: '0xE5bf5D33C617556B91558aAfb7BeadB68E9Cea81',
      farm: 0,
      externalFarm: '',
      scarceToken: 'token0',
      scarceTokenName: 'pol_ichi',
      scarceTokenDecimals: 18
    },
    stimulusName: 'pol_wbtc',
    stimulusDisplayName: 'wBTC',
    tradeUrl:
      'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6&chain=polygon'
  }
};

const LABELS = {};
LABELS[4000] = {
  name: 'oneBTC Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl:
    'https://app.uniswap.org/#/swap?inputCurrency=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174&outputCurrency=0x1f194578e7510A350fb517a9ce63C40Fa1899427&chain=polygon',
  subgraphEndpoint: '',
  isInverted: true,
  isHodl: false,
  vaultName: 'polygon_onebtc',
  vaultAddress: '0xE5bf5D33C617556B91558aAfb7BeadB68E9Cea81',
  //irrStartDate: new Date('2022-05-26T02:00:00'),
  irrStartDate: new Date(0),
  irrStartTxAmount: 0
};
LABELS[4001] = {
  name: 'wBTC Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl:
    'https://app.uniswap.org/#/swap?inputCurrency=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174&outputCurrency=0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6&chain=polygon',
  subgraphEndpoint: '',
  isInverted: true,
  isHodl: true,
  vaultName: 'polygon_wbtc',
  vaultAddress: '0x4aEF5144131dB95c110af41c8Ec09f46295a7C4B',
  //irrStartDate: new Date('2022-05-26T02:00:00'),
  irrStartDate: new Date(0),
  irrStartTxAmount: 0
};
LABELS[4002] = {
  name: 'USDC Vault',
  lpName: 'ICHI_VAULT_LP',
  shortLpName: 'VAULT_LP',
  tradeUrl:
    'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174&chain=polygon',
  subgraphEndpoint: '',
  isInverted: true,
  isHodl: false,
  vaultName: 'polygon_usdc',
  vaultAddress: '0x711901e4b9136119Fb047ABe8c43D49339f161c3',
  irrStartDate: new Date(0),
  irrStartTxAmount: 0
};

export { ADDRESSES, POOLS, LABELS, APIS, TOKENS, CHAIN_ID, BLOCKS_PER_DAY, DEBUNK_PROTOCOLS };
