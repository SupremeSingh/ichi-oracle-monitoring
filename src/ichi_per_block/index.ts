import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';

const ichiPerBlock_tableName = process.env.ICHI_PER_BLOCK_TABLE_NAME || 'ichi-per-block';

export const handler = async (event: APIGatewayProxyEvent) => {
  AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
  });
  const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

  for (let i = 0; i < process.argv.length; i++ ) {
    const arg = process.argv[i];
    if (arg.indexOf(':') > 0) {
      const farm_values = arg.split(':');

      console.log(`Attempting to update table: ${ichiPerBlock_tableName}, farm: ${farm_values[0]}`);
      const params: AWS.DynamoDB.UpdateItemInput = {
        TableName: ichiPerBlock_tableName,
        Key: {
          poolId: {
            N: Number(farm_values[0]).toString()
          }
        },
        UpdateExpression: 'set ' + 
          'ichiPerBlock = :ichiPerBlock',
        ExpressionAttributeValues: {
          ':ichiPerBlock': { N: Number(farm_values[1]).toString() }
        },
        ReturnValues: 'UPDATED_NEW'
      };
    
      try {
        const result = await dbClient.updateItem(params).promise();
        console.log(`Successfully updated table: ${ichiPerBlock_tableName}`);
      } catch (error) {
        throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
      }
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers" : "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET"
    }
  };

};
