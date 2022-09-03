import { APIGatewayProxyEvent } from 'aws-lambda';
import AWS from 'aws-sdk';

export const handler = async (_: APIGatewayProxyEvent) => {
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,GET'
    }
  };
};
