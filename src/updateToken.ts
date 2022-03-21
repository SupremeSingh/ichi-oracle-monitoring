import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ContractInterface, ethers } from 'ethers';
import ERC20_ABI from './abis/ERC20_ABI.json';
import ONELINK_ABI from './abis/oneLINK_ABI.json';
import ONEETH_ABI from './abis/oneETH_ABI.json';
import ONETOKEN_ABI from './abis/ONETOKEN_ABI.json';
import ORACLE_ABI from './abis/ORACLE_ABI.json';
import { ADDRESSES, TOKENS, CHAIN_ID } from './configMainnet';
import axios from 'axios';
import { ChainId, Token, WETH, Fetcher, Route } from '@uniswap/sdk';

const infuraId = process.env.INFURA_ID;
if (!infuraId) {
  console.error('Please export INFURA_ID=*** which is used for https://mainnet.infura.io/v3/***');
  process.exit();
}

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const RPC_HOST = `https://mainnet.infura.io/v3/${infuraId}`;
const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);

const lookUpTokenPrices = async function(id_array) {
  let ids = id_array.join("%2C");
  return await axios.get(
    `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${ids}&vs_currencies=usd&include_24hr_change=true`
  );
};

async function lookUpVBTCPrice() {
  const uni_VBTC = new Token(ChainId.MAINNET, TOKENS['vbtc']['address'], 18)  

  const pair = await Fetcher.fetchPairData(uni_VBTC, WETH[uni_VBTC.chainId])
  const route = new Route([pair], WETH[uni_VBTC.chainId])

  //console.log(route.midPrice.toSignificant(6)) 
  //console.log(route.midPrice.invert().toSignificant(6)) 

  let price_vBTC_wETH = route.midPrice.invert().toSignificant(6);

  let prices = await lookUpTokenPrices([TOKENS['weth']['address'].toLowerCase()]);
  let price_wETH_usd = prices.data[TOKENS['weth']['address'].toLowerCase()].usd;
  let price_vBTC_usd = price_wETH_usd * Number(price_vBTC_wETH);

  return price_vBTC_usd;
};

async function lookUpXICHIPrice() {
  const ichiContract = new ethers.Contract(TOKENS["ichi"].address, ERC20_ABI as ContractInterface, provider);
  const xichiContract = new ethers.Contract(TOKENS["xichi"].address, ERC20_ABI as ContractInterface, provider);

  const xichiSupply = await xichiContract.totalSupply();
  const xichiBalance = await ichiContract.balanceOf(TOKENS["xichi"].address);

  const xichiRatio = Number(xichiBalance) / Number(xichiSupply);

  const lookup_price = await lookUpTokenPrices([TOKENS["ichi"].address.toLowerCase()]);
  const ichiPrice = lookup_price.data[TOKENS["ichi"].address.toLowerCase()].usd;

  return Number(ichiPrice) * xichiRatio;
}

async function lookUpMemberTokenPrice(address: string, memberToken: string, decimals: number) {
  const oneTokenContract = new ethers.Contract(address, ONETOKEN_ABI as ContractInterface, provider);

  const assets = await oneTokenContract.assets(memberToken);
  const oracleAddress = assets["oracle"];

  const oracleContract = new ethers.Contract(oracleAddress, ORACLE_ABI as ContractInterface, provider);

  const price = await oracleContract.read(memberToken, Number(10 ** decimals).toString());

  return Number(price["amountUsd"]) / 10 ** 18;
}

async function lookupStimulusUSDPrice(address: string, decimals: number) {
  const oneTokenContract = new ethers.Contract(address, ONEETH_ABI as ContractInterface, provider);
  let price = await oneTokenContract.getStimulusUSD();
  return Number(price) / 10 ** decimals;
}

async function lookupStimulusOraclePrice(address: string, decimals: number) {
  const oneTokenContract = new ethers.Contract(address, ONELINK_ABI as ContractInterface, provider);
  let price = await oneTokenContract.getStimulusOracle();
  return Number(price) / 10 ** decimals;
}

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateToken = async (tableName: string, tokenName: string): Promise<APIGatewayProxyResult> => {
  const address = TOKENS[tokenName]['address'];
  const decimals = TOKENS[tokenName]['decimals'];
  const isOneToken = TOKENS[tokenName]['isOneToken'];
  const parentOneToken = TOKENS[tokenName]['parentOneToken'];
  const displayName = TOKENS[tokenName]['displayName'];
  let price = 0;
  let priceChange = 0;

  const tokenContract = new ethers.Contract(address, ERC20_ABI as ContractInterface, provider);

  let totalSupply = await tokenContract.totalSupply();
  let totalTokens = Number(totalSupply) / 10 ** decimals;
  let circulating = totalTokens;

  if (tokenName == "ichi") {
    const v1Balance = await tokenContract.balanceOf(ADDRESSES.farming_V1);
    const v2Balance = await tokenContract.balanceOf(ADDRESSES.farming_V2);
    const communityGnosisBalance = await tokenContract.balanceOf(ADDRESSES.ichi_community_gnosis);
    circulating = (Number(totalSupply) - v1Balance - v2Balance - communityGnosisBalance) / 10 ** 9;
  }

  console.log(tokenName);
/*  if (parentOneToken && parentOneToken != "") {
    price = await lookUpMemberTokenPrice(TOKENS[parentOneToken]['address'], address, decimals);
  } else if (isOneToken) {*/
  if (isOneToken) {
    price = 1;
  } else {
    switch(tokenName) {
      case 'usdc':
        price = 1;
        break;
      case 'xichi':
        price = await lookUpXICHIPrice();
        break;
      case 'vbtc':
        price = await lookUpVBTCPrice();
        break;
      case 'pwing':
        price = await lookUpMemberTokenPrice(TOKENS['onewing']['address'], TOKENS['pwing']['address'], 9);
        break;
      case 'boot':
        price = await lookUpMemberTokenPrice(TOKENS['bootusd']['address'], TOKENS['boot']['address'], 9);
        break;
      case 'weth':
        price = await lookupStimulusUSDPrice(TOKENS['oneeth']['address'], 9);
        break;
      case 'wbtc':
        price = await lookUpMemberTokenPrice(TOKENS['onebtc']['address'], TOKENS['wbtc']['address'], 8);
        break;
      case 'link':
        price = await lookupStimulusOraclePrice(TOKENS['onelink']['address'], 9);
        break;
      case 'ichi_v2':
        let ichiAddress = TOKENS['ichi']['address'];
        let lookup_price1 = await lookUpTokenPrices([ichiAddress.toLowerCase()]);
        price = lookup_price1.data[ichiAddress.toLowerCase()].usd;
        priceChange = lookup_price1.data[ichiAddress.toLowerCase()].usd_24h_change;
        break;
      default:
        let lookup_price = await lookUpTokenPrices([address.toLowerCase()]);
        price = lookup_price.data[address.toLowerCase()].usd;
        priceChange = lookup_price.data[address.toLowerCase()].usd_24h_change;
    }    
  }

  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03
  console.log(`Attempting to update table: ${tableName}, token: ${tokenName}`);
  const params: AWS.DynamoDB.UpdateItemInput = {
    TableName: tableName,
    Key: {
      name: {
        S: tokenName
      }
    },
    UpdateExpression: 'set ' + 
      'circulating = :circulating, ' +
      'address = :address, ' +
      'decimals = :decimals, ' +
      'displayName = :displayName, ' +
      'price = :price, ' +
      'price_24h_change = :price_24h_change, ' +
      'chainId = :chainId, ' +
      'isOneToken = :isOneToken, ' +
      'supply = :supply',
    ExpressionAttributeValues: {
      ':circulating': { N: circulating.toString() },
      ':address': { S: address },
      ':decimals': { N: decimals.toString() },
      ':displayName': { S: displayName },
      ':price': { N: Number(price).toString() },
      ':price_24h_change': { N: Number(priceChange).toString() },
      ':chainId': { N: Number(CHAIN_ID).toString() },
      ':isOneToken': { BOOL: isOneToken },
      ':supply': { N: totalTokens.toString() }
    },
    ReturnValues: 'UPDATED_NEW'
  };

  try {
    // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html#API_UpdateItem_Examples
    const result = await dbClient.updateItem(params).promise();
    console.log(`Successfully updated table: ${tableName}`);
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }
};
