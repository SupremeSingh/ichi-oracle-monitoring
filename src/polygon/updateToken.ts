import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { dbClient } from '../configMainnet';
import { ChainId, getErc20Contract, getProvider, getToken, lookUpTokenPrices, TokenName } from '@ichidao/ichi-sdk';

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateToken = async (
  tableName: string,
  tokenName: TokenName,
  chainId: ChainId
): Promise<APIGatewayProxyResult> => {
  const provider = await getProvider(chainId);
  const token = getToken(tokenName, chainId);
  const address = token.address;
  const decimals = token.decimals;
  const isOneToken = token.isOneToken;
  const displayName = token.displayName;
  let price = 0;
  let priceChange = 0;

  const tokenContract = getErc20Contract(address, provider);

  let totalSupply = await tokenContract.totalSupply();
  let totalTokens = Number(totalSupply) / 10 ** decimals;
  let circulating = totalTokens;

  console.log(tokenName);
  if (isOneToken) {
    price = 1;
  } else {
    switch (tokenName) {
      case TokenName.USDC:
        price = 1;
        break;
      case TokenName.ICHI_V2:
        let ichiAddress = getToken(TokenName.ICHI_V2, ChainId.Mainnet).address;
        const ichiTokenPrices = await lookUpTokenPrices([ichiAddress.toLowerCase()]);
        price = ichiTokenPrices[ichiAddress.toLowerCase()].usd;
        priceChange = ichiTokenPrices[ichiAddress.toLowerCase()].usd_24h_change;
        break;
      case TokenName.WBTC:
        let wBTCAddress = getToken(TokenName.WBTC, ChainId.Mainnet).address;
        const wBtcTokenPrices = await lookUpTokenPrices([wBTCAddress.toLowerCase()]);
        price = wBtcTokenPrices[wBTCAddress.toLowerCase()].usd;
        priceChange = wBtcTokenPrices[wBTCAddress.toLowerCase()].usd_24h_change;
        break;
      default:
        const tokenPrices = await lookUpTokenPrices([address.toLowerCase()]);
        price = tokenPrices[address.toLowerCase()].usd;
        priceChange = tokenPrices[address.toLowerCase()].usd_24h_change;
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
      ':chainId': { N: ChainId.Polygon.toString() },
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
