import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { BANNERS } from './configBanner';

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
});
const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

export const updateBanner = async (tableName: string, bannerName: string): Promise<APIGatewayProxyResult> => {

  let buttons = [];

  for (let i = 0; i < Object.keys(BANNERS[bannerName].buttons).length; i++) {
    let button = BANNERS[bannerName].buttons[i];  
    let b = {
      label: { S: button['label'] },
      link: { S: button['link'] }
    };
    buttons.push({ M: b });
  }

  console.log(`Attempting to update table: ${tableName}, index: ${bannerName}`);
  const params: AWS.DynamoDB.UpdateItemInput = {
    TableName: tableName,
    Key: {
      index: {
        S: bannerName
      }
    },
    UpdateExpression: 'set ' + 
      'image = :image, ' +
      'countdown = :countdown, ' +
      'textBase = :textBase, ' +
      'textCountdown = :textCountdown, ' +
      'buttons = :buttons, ' +
      'baseColor = :baseColor, ' +
      'gradientColor0 = :gradientColor0, ' +
      'gradientColor1 = :gradientColor1',
    ExpressionAttributeValues: {
      ':image': { S: BANNERS[bannerName]['image'] },
      ':countdown': { S: BANNERS[bannerName]['countdown'] },
      ':textBase': { S: BANNERS[bannerName]['textBase'] },
      ':textCountdown': { S: BANNERS[bannerName]['textCountdown'] },
      ':buttons': { L: buttons },
      ':baseColor': { S: BANNERS[bannerName]['baseColor'] },
      ':gradientColor0': { S: BANNERS[bannerName]['gradientColor0'] },
      ':gradientColor1': { S: BANNERS[bannerName]['gradientColor1'] },
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
