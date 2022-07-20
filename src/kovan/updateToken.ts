import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { dbClient } from '../configMainnet';
import { ChainId, getErc20Contract, getProvider, getToken, TokenName } from '@ichidao/ichi-sdk';

export const updateToken = async (
  tableName: string,
  tokenName: TokenName,
  chainId: ChainId
): Promise<APIGatewayProxyResult> => {
  const token = getToken(tokenName, chainId);
  const address = token.address;
  const decimals = token.decimals;
  const isOneToken = token.isOneToken;
  const displayName = token.displayName;
  let price = 0;
  let priceChange = 0;

  const provider = await getProvider(chainId);
  const tokenContract = getErc20Contract(address, provider);

  let totalSupply = await tokenContract.totalSupply();
  let totalTokens = Number(totalSupply) / 10 ** decimals;
  let circulating = totalTokens;

  console.log(tokenName);
  if (isOneToken) {
    price = 1;
  } else {
    switch (tokenName) {
      case TokenName.TOKEN_18:
        price = 25;
        priceChange = 4.8876;
        break;
      case TokenName.TOKEN_6:
        price = 1;
        break;
      case TokenName.RENFIL:
        price = 69;
        break;
      case TokenName.ICHI:
        price = 6;
        priceChange = -2.5143526;
        break;
      case TokenName.XICHI:
        price = 6.2;
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
        S: getToken(tokenName, chainId).tableName
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
