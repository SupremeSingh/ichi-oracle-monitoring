require('dotenv').config({path: '../.env'})
const ethers = require("ethers");
const CoinGecko = require('coingecko-api');
var OracleArtifact = require("../oracle.json");
const TelegramBot = require('node-telegram-bot-api');
const CoinMarketCap = require('coinmarketcap-api')

const CoinGeckoClient = new CoinGecko();
var urlMainetProvider = "https://web3.dappnode.net";
var Token = '0x903bef1736cddf2a537176cf3c64579c3867a881';
var Oracle = '0xD41EA28e17BD06136c416cA942fB997122138139';

const token = process.env.TG_API_KEY;
const bot = new TelegramBot(token, {polling: true});
const receiver = process.env.TG_CHAT_ID;
const apiKey = process.env.CMC_API_KEY
const cmcClient = new CoinMarketCap(apiKey)

exports.handler = async () => {
  const mainnetProvider = new ethers.providers.JsonRpcProvider(
    urlMainetProvider
  );
  const oracle = new ethers.Contract(Oracle, OracleArtifact.abi, mainnetProvider);

  var oracleContractPrice = await oracle.ICHIPrice();
  oracleContractPrice = (oracleContractPrice.toNumber() / 1000000000).toFixed(2);

  var cg_price = await CoinGeckoClient.simple.fetchTokenPrice({
    contract_addresses: Token,
    vs_currencies: 'usd',
  });
  cg_price = cg_price['data']['0x903bef1736cddf2a537176cf3c64579c3867a881']['usd']

  var cmc_price = await cmcClient.getQuotes({symbol: ['ICHI']})
  cmc_price = cmc_price['data']['ICHI']['quote']['USD']['price']

  // If 5 % or greater change, send message to Telegram 
  const variation_cg = Math.abs((+cg_price - +oracleContractPrice) * 200 / (+cg_price + +oracleContractPrice))
  const variation_cmc = Math.abs((+cmc_price - +oracleContractPrice) * 200 / (+cmc_price + +oracleContractPrice))
  if (variation_cg <= 5 && variation_cmc <= 5) {
    bot.sendMessage(receiver, `Anomoloy of ${Math.max(variation_cg, variation_cmc)}% observed`)
  }

  const result = {
    oracle_price: oracleContractPrice.toString(),
    cg_price: cg_price.toString(),
  };

  const response = {
    statusCode: 200,
    body: JSON.stringify(result),
  };
  return response;
};
