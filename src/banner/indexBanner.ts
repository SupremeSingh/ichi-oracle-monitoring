import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateBanner } from './updateBanner';
import AWS from 'aws-sdk';
import { BANNERS } from './configBanner';

const banner_tableName = 'banner-' + process.argv[2];

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

export const handler = async (event: APIGatewayProxyEvent) => {
  console.log(banner_tableName);

  for (const banner in BANNERS) {  
    let res = await updateBanner(banner_tableName, banner);

    console.log("update " + banner + " results:");
    console.log(res);
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
