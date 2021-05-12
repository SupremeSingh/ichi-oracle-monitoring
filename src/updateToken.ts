import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { BigNumber, ContractInterface, ethers } from 'ethers';
import ichiAbi from './abis/ICHI_ABI.json';
import { configMainnet, configKovan } from './config';

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
const ICHI = configMainnet.ichi;
const farmV1 = configMainnet.farming_V1;
const farmV2 = configMainnet.farming_V2;

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateToken = async (tableName: string, tokenName: string): Promise<APIGatewayProxyResult> => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);

  const token = new ethers.Contract(ICHI, ichiAbi as ContractInterface, provider);
  const ichiTotal = BigNumber.from('5000000000000000');
  const v1Balance = await token.balanceOf(farmV1);
  const v2Balance = await token.balanceOf(farmV2);
  console.log(ethers.utils.formatUnits(v1Balance, 9));
  console.log(ethers.utils.formatUnits(v2Balance, 9));
  const total = ethers.utils.formatUnits(ichiTotal.sub(v1Balance).sub(v2Balance), 9);
  console.log(`total: ${total}`);

  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03
  console.log(`Attempting to update table: ${tableName}, token: ${tokenName}`);
  const params: AWS.DynamoDB.UpdateItemInput = {
    TableName: tableName,
    Key: {
      name: {
        S: tokenName
      }
    },
    UpdateExpression: 'set circulating = :c',
    ExpressionAttributeValues: {
      ':c': { N: total }
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
