import { APIGatewayProxyEvent } from 'aws-lambda';

import oracleTracker from './components/oracleTracker';
import { lambdaResponse, OracleResponse, VaultResponse } from "./utils/lambdaTypes";
import { ICHIVaults } from "./utils/vaultData";
import vaultStatusTracker from './components/vaultTracker';
import messenger  from './utils/telegram';

var urlMainetProvider: string = "https://eth-mainnet.g.alchemy.com/v2/x2Go7KMQjJlBfM6E3y3hdfbHIYbouuh0";

export const handler = async (event: APIGatewayProxyEvent) => {

  const oracleResult: OracleResponse = await oracleTracker();
  const vaultStatusResult: VaultResponse = await vaultStatusTracker(urlMainetProvider, ICHIVaults);

  if (parseInt(oracleResult.max_variation) >= 5) {
    await messenger(`A big difference in the ICHI price - ${parseInt(oracleResult.max_variation).toFixed(2)}%`);
  }
  
  if (vaultStatusResult.address.length > 0) {
    await messenger("Vault status off since last check \n\n" + vaultStatusResult.address.join(', '));
  }

  const response: lambdaResponse = {
    statusCode: 200,
    body: JSON.stringify(oracleResult) + JSON.stringify(vaultStatusResult),
  };

  return response;
};
