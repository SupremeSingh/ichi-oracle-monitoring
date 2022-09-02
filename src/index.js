require('dotenv').config({path: '../.env'})
const oracleTracker = require('./components/oracleTracker');
const vaultStatusTracker = require('./components/vaultStatusTracker');
const telegram = require('./telegram');

exports.handler = async () => {
  const oracleResult = await oracleTracker.oracleTracker();
  const vaultStatusResult = await vaultStatusTracker.vaultStatusTracker();

  if (parseInt(oracleResult.max_variation) >= 5) {
    await telegram.messenger(`A big difference in the ICHI price - ${parseInt(oracleResult.max_variation).toFixed(2)}%`);
  }
  
  if (parseInt(vaultStatusResult.address.length) > 0) {
    await telegram.messenger("Vault status off since last check \n\n" + vaultStatusResult.address.join(', '));
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify(oracleResult) + JSON.stringify(vaultStatusResult),
  };

  return response;
};
