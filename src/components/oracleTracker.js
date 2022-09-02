require('dotenv').config({path: '../.env'})
const ethers = require("ethers");
const CoinGecko = require('coingecko-api');
var OracleArtifact = require("../../builds/oracle.json");
const CoinMarketCap = require('coinmarketcap-api')

var urlMainetProvider = "https://web3.dappnode.net";
var Token = '0x903bef1736cddf2a537176cf3c64579c3867a881';
var Oracle = '0xD41EA28e17BD06136c416cA942fB997122138139';

const CoinGeckoClient = new CoinGecko();
const apiKey = process.env.CMC_API_KEY
const cmcClient = new CoinMarketCap(apiKey)

exports.oracleTracker = async () => {
  const mainnetProvider = new ethers.providers.JsonRpcProvider(
    urlMainetProvider
  );
  const oracle = new ethers.Contract(Oracle, OracleArtifact, mainnetProvider);

  var oracleContractPrice = await oracle.ICHIPrice();
  oracleContractPrice = (oracleContractPrice.toNumber() / 1000000000).toFixed(2);

  var cg_price = await CoinGeckoClient.simple.fetchTokenPrice({
    contract_addresses: Token,
    vs_currencies: 'usd',
  });
  cg_price = cg_price['data']['0x903bef1736cddf2a537176cf3c64579c3867a881']['usd']

  var cmc_price = await cmcClient.getQuotes({symbol: ['ICHI']})
  cmc_price = cmc_price['data']['ICHI']['quote']['USD']['price']

  const variation_cg = Math.abs((+cg_price - +oracleContractPrice) * 200 / (+cg_price + +oracleContractPrice))
  const variation_cmc = Math.abs((+cmc_price - +oracleContractPrice) * 200 / (+cmc_price + +oracleContractPrice))

  const result = {
    oracle_price: oracleContractPrice.toString(),
    cg_price: cg_price.toString(),
    max_variation: Math.max(variation_cg, variation_cmc).toString(),
  };

  return result;
};
