export type lambdaResponse = {
    statusCode: number;
    body: string;
};

export type VaultResponse = {
    address: string[];
    timestamp: string;
};

export type OracleResponse = {
    oracle_price: string;
    cg_price: string;
    cmc_price: string;
    max_variation: string;
};
