import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ContractInterface, ethers } from 'ethers';
import ERC20_ABI from './../abis/ERC20_ABI.json';
import { TOKENS, CHAIN_ID } from './configKovan';

const infuraId = process.env.INFURA_ID;
if (!infuraId) {
  console.error('Please export INFURA_ID=*** which is used for https://kovan.infura.io/v3/***');
  process.exit();
}

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const RPC_HOST = `https://kovan.infura.io/v3/${infuraId}`;
const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);

export const updateToken = async (tableName: string, tokenName: string): Promise<APIGatewayProxyResult> => {
  const address = TOKENS[tokenName]['address'];
  const decimals = TOKENS[tokenName]['decimals'];
  const isOneToken = TOKENS[tokenName]['isOneToken'];
  const displayName = TOKENS[tokenName]['displayName'];
  let price = 0;

  const tokenContract = new ethers.Contract(address, ERC20_ABI as ContractInterface, provider);

  let totalSupply = await tokenContract.totalSupply();
  let totalTokens = Number(totalSupply) / 10 ** decimals;
  let circulating = totalTokens;

  console.log(tokenName);
  if (isOneToken) {
    price = 1;
  } else {
    switch(tokenName) {
      case 'token18':
        price = 25;
        break;
      case 'token6':
        price = 1;
        break;
      case 'test_ichi':
        price = 6;
        break;
      case 'test_xichi':
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
        S: tokenName
      }
    },
    UpdateExpression: 'set ' + 
      'circulating = :circulating, ' +
      'address = :address, ' +
      'decimals = :decimals, ' +
      'displayName = :displayName, ' +
      'price = :price, ' +
      'isOneToken = :isOneToken, ' +
      'chainId = :chainId, ' +
      'supply = :supply',
    ExpressionAttributeValues: {
      ':circulating': { N: circulating.toString() },
      ':address': { S: address },
      ':decimals': { N: decimals.toString() },
      ':displayName': { S: displayName },
      ':price': { N: Number(price).toString() },
      ':isOneToken': { BOOL: isOneToken },
      ':chainId': { N: Number(CHAIN_ID).toString() },
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
