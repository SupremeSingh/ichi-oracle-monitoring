import { JsonRpcProvider } from '@ethersproject/providers';
import { BSC_APIS } from './configBSC';
const rpcHost = process.env.RPC_HOST;

export const ChainId = {
  mainnet: 1,
  kovan: 42,
  polygon: 137,
  goerli: 5,
  mumbai: 80001,
  bsc: 56
};

type NetworkObject = {
  chainId: number;
  name: string;
  rpc_url: string;
  provider?: JsonRpcProvider;
};
export const SUPPORTED_NETWORKS: Record<number, NetworkObject> = {
  [ChainId.mainnet]: {
    chainId: ChainId.mainnet,
    name: 'Ethereum',
    rpc_url: 'https://mainnet.infura.io/v3/'
  },
  [ChainId.kovan]: {
    chainId: ChainId.kovan,
    name: 'Kovan',
    rpc_url: 'https://kovan.infura.io/v3/'
  },
  [ChainId.polygon]: {
    chainId: ChainId.polygon,
    name: 'Polygon',
    rpc_url: 'https://polygon-mainnet.infura.io/v3/'
  },
  [ChainId.goerli]: {
    chainId: ChainId.polygon,
    name: 'Polygon',
    rpc_url: 'https://goerli.infura.io/v3/'
  },
  [ChainId.mumbai]: {
    chainId: ChainId.mumbai,
    name: 'Mumbai',
    // rpc_url: 'https://polygon-mumbai.infura.io/v3/'
    rpc_url: 'https://polygon-mumbai.g.alchemy.com/v2/'
  },
  [ChainId.bsc]: {
    chainId: ChainId.bsc,
    name: 'BSC',
    rpc_url: BSC_APIS.rpcHost
  }
};

if (!rpcHost) {
  console.error('Please export RPC_HOST=*** which is used for then provider');
  process.exit();
}

const alchemyId = process.env.ALCHEMY_ID;
if (!alchemyId) {
  console.error('Please export ALCHEMY_ID=*** which is used for https://polygon-mumbai.g.alchemy.com/v2/***');
  process.exit();
}

const infuraId = process.env.INFURA_ID;
if (!infuraId) {
  console.error(
    'Please export INFURA_ID=*** which is used for https://mainnet.infura.io/v3/***, and https://polygon-mainnet.infura.io/v3/***, and https://kovan.infura.io/v3/***'
  );
  process.exit();
}

const RPC_HOST = process.env.RPC_HOST;
const RPC_HOST_BACKUP = `${SUPPORTED_NETWORKS[ChainId.mainnet].rpc_url}${infuraId}`;

let primaryMainnetProvider: JsonRpcProvider;
let backupMainnetProvider: JsonRpcProvider;
let kovanProvider: JsonRpcProvider;
let goerliProvider: JsonRpcProvider;

let bscProvider: JsonRpcProvider;
let polygonProvider: JsonRpcProvider;
let mumbaiProvider: JsonRpcProvider;

// This uses Quorum and not applicable to our current scenario but it may make sense in the future to target multiple
// backup provides like infura and another provider as 2 backups in Quorum.
// export let mainnetProvider = new ethers.providers.FallbackProvider([
//   {provider: primaryMainnetProvider, priority: 1, weight: 1, stallTimeout: 0},
//   {provider: backupMainnetProvider, priority: 2, weight: 1, stallTimeout: 0},
// ]);

export const getProvider = async (chainId: number): Promise<JsonRpcProvider> => {
  switch (chainId) {
    case ChainId.mainnet:
      if (!primaryMainnetProvider) {
        primaryMainnetProvider = new JsonRpcProvider({ url: RPC_HOST });
      }

      try {
        await primaryMainnetProvider.getBlockNumber();
        // await primaryMainnetProvider.ready;
        return primaryMainnetProvider;
      } catch (e) {
        console.warn(`Could not connect to ${RPC_HOST}, falling back to: ${RPC_HOST_BACKUP}`);
      }

      try {
        if (!backupMainnetProvider) {
          backupMainnetProvider = new JsonRpcProvider({ url: RPC_HOST_BACKUP });
        }
        // await backupMainnetProvider.getBlockNumber();
        return backupMainnetProvider;
      } catch (e) {
        console.error(`Could not connect to backup provider: ${RPC_HOST_BACKUP}`);
      }
      throw new Error(`Could not connect to primary or backup providers, please check network`);
    case ChainId.kovan:
      if (!kovanProvider) {
        kovanProvider = new JsonRpcProvider(`${SUPPORTED_NETWORKS[ChainId.kovan].rpc_url}${infuraId}`);
      }
      return kovanProvider;
    case ChainId.goerli:
      if (!goerliProvider) {
        goerliProvider = new JsonRpcProvider(`${SUPPORTED_NETWORKS[ChainId.goerli].rpc_url}${infuraId}`);
      }
      return goerliProvider;
    case ChainId.bsc:
      if (!bscProvider) {
        bscProvider = new JsonRpcProvider(`${SUPPORTED_NETWORKS[ChainId.bsc].rpc_url}`);
      }
      return bscProvider;
    case ChainId.polygon:
      if (!polygonProvider) {
        polygonProvider = new JsonRpcProvider(`${SUPPORTED_NETWORKS[ChainId.polygon].rpc_url}${infuraId}`);
      }
      return polygonProvider;
    case ChainId.mumbai:
      if (!mumbaiProvider) {
        mumbaiProvider = new JsonRpcProvider(`${SUPPORTED_NETWORKS[ChainId.mumbai].rpc_url}${alchemyId}`);
      }
      return mumbaiProvider;
    default:
      throw new Error(`Could not connect to primary or backup providers, please check network`);
  }

  // if (chainId === ChainId.mainnet) {
  //   try {
  //     await primaryMainnetProvider.getBlockNumber();
  //     // await primaryMainnetProvider.ready;
  //     return primaryMainnetProvider;
  //   } catch (e) {
  //     console.error(`Could not connect to ${RPC_HOST}, falling back to: ${RPC_HOST_BACKUP}`);
  //   }

  //   try {
  //     await backupMainnetProvider.getBlockNumber();
  //     return backupMainnetProvider;
  //   } catch (e) {
  //     console.error(`Could not connect to backup provider: ${RPC_HOST_BACKUP}`);
  //   }
  // } else if (chainId === ChainId.bsc) {
  //   if (!bscProvider) {
  //     bscProvider = new JsonRpcProvider(BSC_APIS.rpcHost);
  //   }
  //   return bscProvider;
  // } else if (chainId === ChainId.polygon) {
  //   if (!polygonProvider) {
  //     polygonProvider = new JsonRpcProvider(`${SUPPORTED_NETWORKS[ChainId.polygon]}${infuraId}`);
  //   }
  //   return polygonProvider;
  // }
  // throw new Error(`Could not connect to primary or backup providers, please check network`);
};
