import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateBanner } from './updateBanner';
import { BANNERS } from './configBanner';

const banner_tableName = 'banner-' + process.argv[2];

export const handler = async (_: APIGatewayProxyEvent) => {
  console.log(banner_tableName);

  const promises: Promise<APIGatewayProxyResult>[] = [];
  for (const banner in BANNERS) {
    promises.push(updateBanner(banner_tableName, banner));
  }
  const results = await Promise.all(promises);
  console.log(`Updated all banners`, results);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,GET'
    }
  };
};
