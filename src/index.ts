import * as dotenv from "dotenv";
import oracleTracker from './components/oracleTracker';
import { lambdaResponse, OracleResponse, VaultResponse } from "./types";
import vaultStatusTracker from './components/vaultStatusTracker';
import messenger  from './telegram';

dotenv.config({ path: '../.env' });

exports.handler = async (): Promise<lambdaResponse> => {
  const oracleResult: OracleResponse = await oracleTracker();
  const vaultStatusResult: VaultResponse = await vaultStatusTracker();

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
