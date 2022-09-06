import { ethers } from "ethers";
import CoinGecko from 'coingecko-api';
import { OracleResponse } from "../utils/lambdaTypes";
import CoinMarketCap from 'coinmarketcap-api';
import {BigNumber} from "@ethersproject/bignumber"
import { getIchiOracleAggregatorContract } from "@ichidao/ichi-sdk";

var urlMainetProvider: string = "https://web3.dappnode.net";
var Token: string  = '0x903bef1736cddf2a537176cf3c64579c3867a881';
var Oracle: string = '0xD41EA28e17BD06136c416cA942fB997122138139';

const CoinGeckoClient: any = new CoinGecko();
const cmcAPIKey: string = '56e9147f-041f-4e58-8850-360a147d3d06'
const cmcClient: any = new CoinMarketCap(cmcAPIKey)

async function oracleTracker (urlMainetProvider: string): Promise<OracleResponse> {
  const mainnetProvider: any = new ethers.providers.JsonRpcProvider(
    urlMainetProvider
  );

  const oracle: any = getIchiOracleAggregatorContract(Oracle, mainnetProvider);
  var oracleContractPriceBN: BigNumber;
  var cg_price: any;
  var cmc_price: any;

  try {
    oracleContractPriceBN = await oracle.ICHIPrice();
    cg_price = await CoinGeckoClient.simple.fetchTokenPrice({
      contract_addresses: Token,
      vs_currencies: 'usd',
    });
    cmc_price = await cmcClient.getQuotes({symbol: ['ICHI']})
  } catch (error) {
      console.error(error)
  }

  var oracleContractPrice: string = (oracleContractPriceBN.toNumber() / 1000000000).toFixed(2);
  cg_price = cg_price['data']['0x903bef1736cddf2a537176cf3c64579c3867a881']['usd']
  cmc_price = cmc_price['data']['ICHI']['quote']['USD']['price']

  const variation_cg: number = Math.abs((+cg_price - +oracleContractPrice) * 200 / (+cg_price + +oracleContractPrice))
  const variation_cmc: number = Math.abs((+cmc_price - +oracleContractPrice) * 200 / (+cmc_price + +oracleContractPrice))

  const result: OracleResponse = {
    oracle_price: oracleContractPrice.toString(),
    cg_price: cg_price.toString(),
    cmc_price: cmc_price.toString(),
    max_variation: Math.max(variation_cg, variation_cmc).toString(),
  };

  return result;
};

export default oracleTracker;
