import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { dbClient } from '../configMainnet';
import { ChainId, getErc20Contract, getProvider, getToken, TokenName } from '@ichidao/ichi-sdk';

export const updateToken = async (
  tableName: string,
  tokenName: TokenName,
  chainId: ChainId
): Promise<APIGatewayProxyResult> => {
  const address = getToken(tokenName, chainId).address;
  const decimals = getToken(tokenName, chainId).decimals;
  const isOneToken = getToken(tokenName, chainId).isOneToken;
  const displayName = getToken(tokenName, chainId).displayName;
  let price = 0;
  let priceChange = 0;

  const provider = await getProvider(ChainId.Mumbai);
  const tokenContract = getErc20Contract(address, provider);

  let totalSupply = await tokenContract.totalSupply();
  let totalTokens = Number(totalSupply) / 10 ** decimals;
  let circulating = totalTokens;

  console.log(tokenName);
  if (isOneToken) {
    price = 1;
  } else {
    switch (tokenName) {
      // TODO: Logic change, review
      // case 'mum_token6':
      case TokenName.TOKEN_6:
        price = 25;
        break;
      // TODO: Logic change, review
      // case 'mum_usdc':
      case TokenName.USDC:
        price = 1;
        break;
      // TODO: Logic change, review
      // case 'mum_ichi':
      case TokenName.ICHI_V2:
        price = 17;
        break;
      default:
        price = 1;
        break;
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
      'isOneToken = :isOneToken, ' +
      'chainId = :chainId, ' +
      'supply = :supply',
    ExpressionAttributeValues: {
      ':circulating': { N: circulating.toString() },
      ':address': { S: address },
      ':decimals': { N: decimals.toString() },
      ':displayName': { S: displayName },
      ':price': { N: Number(price).toString() },
      ':price_24h_change': { N: Number(priceChange).toString() },
      ':isOneToken': { BOOL: isOneToken },
      ':chainId': { N: chainId.toString() },
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
