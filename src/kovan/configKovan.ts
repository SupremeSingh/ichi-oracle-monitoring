const CHAIN_ID = 42;

const ADDRESSES = {
  farming_V2: "0xCfF363294b876F27dF7aCe9584B243177bF618af",
  ETH: "0x0000000000000000000000000000000000000000",
};

const APIS = {
}

const POOLS = {
//  activePools : [5001,5002,5003],
  activePools : [5002],
  depositPools : [5002],
  upcomingPools : [],
  migratingPools : [],
  retiredPools : []
}

const TOKENS = {
  oti: { 
    address: "0x5BF9b9bB304672c3d006955AbFC516e8b37693F9",
    decimals: 18,
    displayName: "OTI",
    isOneToken: true,
    isV2: true
  },
  test_ichi: { 
    address: "0x9b5795db93d4c3cc727b5efdaa78f8ec5feb1af2",
    decimals: 9,
    displayName: "TICHI",
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
LABELS[5002] = {
  name: 'OTI Deposit',
  lpName: 'OTI',
  shortLpName: 'OTI'
}

export { ADDRESSES, APIS, POOLS, LABELS, TOKENS, CHAIN_ID };
