import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ContractInterface, ethers } from 'ethers';
import ERC20_ABI from '../abis/ERC20_ABI.json';
import { TOKENS, CHAIN_ID } from './configPolygon';
import { dbClient, TOKENS as MAINNET_TOKENS } from '../configMainnet';
import axios from 'axios';
import { ChainId, getProvider } from '../providers';

const lookUpTokenPrices = async function (id_array) {
  let ids = id_array.join('%2C');
  return await axios.get(
    `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${ids}&vs_currencies=usd&include_24hr_change=true`
  );
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateToken = async (tableName: string, tokenName: string): Promise<APIGatewayProxyResult> => {
  const provider = await getProvider(ChainId.polygon);
  const address = TOKENS[tokenName]['address'];
  const decimals = TOKENS[tokenName]['decimals'];
  const isOneToken = TOKENS[tokenName]['isOneToken'];
  const displayName = TOKENS[tokenName]['displayName'];
  let price = 0;
  let priceChange = 0;

  const tokenContract = new ethers.Contract(address, ERC20_ABI as ContractInterface, provider);

  let totalSupply = await tokenContract.totalSupply();
  let totalTokens = Number(totalSupply) / 10 ** decimals;
  let circulating = totalTokens;

  console.log(tokenName);
  if (isOneToken) {
    price = 1;
  } else {
    switch (tokenName) {
      case 'pol_usdc':
        price = 1;
        break;
      case 'pol_ichi':
        let ichiAddress = MAINNET_TOKENS['ichi']['address'];
        let lookup_price_ichi = await lookUpTokenPrices([ichiAddress.toLowerCase()]);
        price = lookup_price_ichi.data[ichiAddress.toLowerCase()].usd;
        priceChange = lookup_price_ichi.data[ichiAddress.toLowerCase()].usd_24h_change;
        break;
      case 'pol_wbtc':
        let wBTCAddress = MAINNET_TOKENS['wbtc']['address'];
        let lookup_price_wbtc = await lookUpTokenPrices([wBTCAddress.toLowerCase()]);
        price = lookup_price_wbtc.data[wBTCAddress.toLowerCase()].usd;
        priceChange = lookup_price_wbtc.data[wBTCAddress.toLowerCase()].usd_24h_change;
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
    UpdateExpression:
      'set ' +
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
