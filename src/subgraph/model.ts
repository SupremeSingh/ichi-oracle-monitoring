import { GraphQLError } from "graphql";
import * as pkg from '@apollo/client';

export type GraphData = {
    data: any;
    errors?: readonly GraphQLError[];
    error?: pkg.ApolloError;
    loading: boolean;
    networkStatus: pkg.NetworkStatus;
    partial?: boolean;
}
