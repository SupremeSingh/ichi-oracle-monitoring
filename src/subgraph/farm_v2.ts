import { APIS } from '../configMainnet';
import * as pkg from '@apollo/client';
import 'cross-fetch/dist/node-polyfill.js';
import { GraphData } from './model';

const { ApolloClient, InMemoryCache, gql } = pkg;

const farmv2Query = `
    query {
        farms{
          id
          lpToken
          rewardTokensPerBlock
          totalAllocPoints
          totalLPSupply
          accIchiPerShare
          lastRewardBlock
          allocPoint
          poolIchiReward
          ichiPerBlock
          lpTokenSymbol
        }
    }
`

export type GraphFarm = {
    id: string,
    LPToken: string,
    rewardTokensPerBlock: number,
    totalAllocPoints: number,
    totalLPSupply: number,
    accIchiPerShare: number,
    lastRewardBlock: number,
    allocPoint: number,
    poolIchiReward: number,
    ichiPerBlock: number,
    lpTokenSymbol: string
}

async function farm_v2_graph_query(endpoint: string) {
    let tokensQuery = farmv2Query;
    var client = new ApolloClient({
        uri: endpoint,
        cache: new InMemoryCache(),
    })
    try {
        return await client.query({
            query: gql(tokensQuery),
        }) as GraphData
    } catch (error) {
        console.log("error: farmV2 subgraph is not available");
        return false
    }
}

export async function getSubgraphPoolRecords(): Promise<false | Map<number,GraphFarm>> {
    let data: boolean | GraphData = await farm_v2_graph_query(APIS.subgraph_farming_v2);
    let farm_map = new Map();
    if(data && data.data && data.data.farms && data.data.farms.length > 0) {
        for (let farm of data.data.farms) {
            let temp: GraphFarm = {
                id: farm.id,
                LPToken: farm.lpToken,
                rewardTokensPerBlock: farm.rewardTokensPerBlock,
                totalAllocPoints: farm.totalAllocPoints,
                totalLPSupply: farm.totalLPSupply,
                accIchiPerShare: farm.accIchiPerShare,
                lastRewardBlock: farm.lastRewardBlock,
                allocPoint: farm.allocPoint,
                poolIchiReward: farm.poolIchiReward,
                ichiPerBlock: farm.ichiPerBlock,
                lpTokenSymbol: farm.lpTokenSymbol
            }
            farm_map.set(Number(temp.id), temp);
        }
    }
    else {
        return false;
    }

    return farm_map;
}
