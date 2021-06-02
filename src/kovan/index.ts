import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateTokens } from './updateTokens';
import { updateTreasury } from './updateTreasury';
import { updateFarms } from './updateFarms';
import AWS from 'aws-sdk';

const token_tableName = process.env.TOKEN_TABLE_NAME || 'token-dev';
const treasury_tableName = process.env.TREASURY_TABLE_NAME || 'treasury-dev';
const farms_tableName = process.env.FARMS_TABLE_NAME || 'farms-dev';

export const handler = async (event: APIGatewayProxyEvent) => {
  AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
  });
  const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

  //await updateTokens(token_tableName);

  const tokenPrices = {};
  const tokenNames = {};
  tokenNames['eth'] = 'ETH';

  let params = {
    TableName: token_tableName,
    FilterExpression: "#isOneToken = :is_one_token",
    ExpressionAttributeNames: {
        "#isOneToken": "isOneToken",
    },
    ExpressionAttributeValues: { ":is_one_token": { BOOL: false } }
  };
  try {
    const result = await dbClient.scan(params).promise();
    for (let i = 0; i < result.Items.length; i++) {
      let item = result.Items[i];
      let name = item['name']['S'].toLowerCase();
      tokenPrices[name] = Number(item['price']['N'])
      tokenNames[name] = item['displayName']['S']
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  params = {
    TableName: token_tableName,
    FilterExpression: "#isOneToken = :is_one_token",
    ExpressionAttributeNames: {
        "#isOneToken": "isOneToken",
    },
    ExpressionAttributeValues: { ":is_one_token": { BOOL: true } }
  };
  try {
    const result = await dbClient.scan(params).promise();
    for (let i = 0; i < result.Items.length; i++) {
      let item = result.Items[i];
      let name = item['name']['S'].toLowerCase();
      tokenNames[name] = item['displayName']['S']
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  //console.log(tokenPrices);
  //console.log(tokenNames);

  // TODO - farms
  //await updateFarms(farms_tableName, tokenPrices, tokenNames);
  await updateTreasury(treasury_tableName, tokenPrices, tokenNames);

};
