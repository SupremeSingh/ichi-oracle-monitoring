import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ContractInterface, ethers } from 'ethers';
import ERC20_ABI from './abis/ERC20_ABI.json';
import ONELINK_ABI from './abis/oneLINK_ABI.json';
import ONEETH_ABI from './abis/oneETH_ABI.json';
import { ADDRESSES, TOKENS } from './configMainnet';
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

const farmV1 = ADDRESSES.farming_V1;
const farmV2 = ADDRESSES.farming_V2;

const lookUpTokenPrices = async function(id_array) {
  let ids = id_array.join("%2C");
  return await axios.get(
    `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${ids}&vs_currencies=usd`
  );
};

async function lookUpVBTCPrice() {
  const uni_VBTC = new Token(ChainId.MAINNET, TOKENS['vBTC']['address'], 18)  

  const pair = await Fetcher.fetchPairData(uni_VBTC, WETH[uni_VBTC.chainId])
  const route = new Route([pair], WETH[uni_VBTC.chainId])

  //console.log(route.midPrice.toSignificant(6)) 
  //console.log(route.midPrice.invert().toSignificant(6)) 

  let price_vBTC_wETH = route.midPrice.invert().toSignificant(6);

  let prices = await lookUpTokenPrices([TOKENS['wETH']['address'].toLowerCase()]);
  let price_wETH_usd = prices.data[TOKENS['wETH']['address'].toLowerCase()].usd;
  let price_vBTC_usd = price_wETH_usd * Number(price_vBTC_wETH);

  return price_vBTC_usd;
};

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
  let price = 0;

  const tokenContract = new ethers.Contract(address, ERC20_ABI as ContractInterface, provider);

  let totalSupply = await tokenContract.totalSupply();
  let totalTokens = Number(totalSupply) / 10 ** decimals;
  let circulating = totalTokens;

  if (tokenName == "ichi") {
    const v1Balance = await tokenContract.balanceOf(farmV1);
    const v2Balance = await tokenContract.balanceOf(farmV2);
    circulating = (Number(totalSupply) - v1Balance - v2Balance) / 10 ** 9;
  }

  console.log(tokenName);
  if (isOneToken) {
    price = 1;
  } else {
    switch(tokenName) {
      case 'xichi':
        price = 0;
        break;
      case 'vBTC':
        price = await lookUpVBTCPrice();
        break;
      case 'pWING':
        price = await lookupStimulusUSDPrice(TOKENS['oneWING']['address'], 9);
        break;
      case 'wETH':
        price = await lookupStimulusUSDPrice(TOKENS['oneETH']['address'], 9);
        break;
      case 'wBTC':
        price = await lookupStimulusOraclePrice(TOKENS['oneBTC']['address'], 9);
        break;
      case 'link':
        price = await lookupStimulusOraclePrice(TOKENS['oneLINK']['address'], 9);
        break;
      default:
        let lookup_price = await lookUpTokenPrices([address.toLowerCase()]);
        price = lookup_price.data[address.toLowerCase()].usd;
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
      'price = :price, ' +
      'isOneToken = :isOneToken, ' +
      'supply = :supply',
    ExpressionAttributeValues: {
      ':circulating': { N: circulating.toString() },
      ':address': { S: address },
      ':decimals': { N: decimals.toString() },
      ':price': { N: Number(price).toString() },
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
