import { ChainId } from '@ichidao/ichi-sdk';
import AWS from 'aws-sdk';
import { dbClient } from './configMainnet';

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

export const getAllData = async (params) => {
  const _getAllData = async (params, startKey) => {
    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }
    return dbClient.scan(params).promise();
  };

  let lastEvaluatedKey = null;
  let rows = [];

  do {
    const result = await _getAllData(params, lastEvaluatedKey);
    rows = rows.concat(result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return rows;
};

export async function getDynamoTokens(tableName: string, isOneToken: boolean, chainId: ChainId): Promise<any[]> {
  let params = {
    TableName: tableName,
    FilterExpression: '#isOneToken = :is_one_token AND #chainId = :chain_id',
    ExpressionAttributeNames: {
      '#isOneToken': 'isOneToken',
      '#chainId': 'chainId'
    },
    ExpressionAttributeValues: { ':is_one_token': { BOOL: isOneToken }, ':chain_id': { N: chainId.toString() } }
  };
  try {
    const results = await getAllData(params);
    return results;
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }
}
