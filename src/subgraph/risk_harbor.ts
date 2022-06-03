import * as pkg from '@apollo/client';
import 'cross-fetch/dist/node-polyfill.js';
import { GraphData } from './model';

const { ApolloClient, InMemoryCache, gql } = pkg;

const riskHarborQuery = `
  query($user_id: String!) {
    underwriterPositions (where: {user_in: [$user_id]}) {
      id
      shares
      vault {
        totalPremiumsPaid
        totalCapacity
        totalSharesIssued
      }
    }
  }
`;

export type RiskHarborVault = {
  id: string;
  totalPremiumsPaid: string;
  totalCapacity: string;
  totalSharesIssued: string;
};

export type RiskHarborPosition = {
  id: string;
  shares: string;
  vault: RiskHarborVault;
};

export async function risk_harbor_graph_query(endpoint: string, user_id: string) {
  var client = new ApolloClient({
    uri: endpoint,
    cache: new InMemoryCache()
  });
  try {
    return (await client.query({
      query: gql(riskHarborQuery),
      variables: {
        user_id: user_id
      }
    })) as GraphData;
  } catch (error) {
    console.log('error: risk harbor subgraph is not available');
    return false;
  }
}
