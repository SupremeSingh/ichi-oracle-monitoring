import AWS from 'aws-sdk';
import { dbClient } from '../utils/configMainnet';
import { DynamoResponse } from '../utils/lambdaTypes';
import { Vault } from "@ichidao/ichi-sdk";

export async function vaultReader (vaultsTableName: string, vault: Vault): Promise<boolean> {
  var result;
  var params = {
      TableName: vaultsTableName,
      Key: {
        name: {
          S: vault.tableName.toLowerCase()
        }
      },
      ProjectionExpression: 'depositStatus'
    };

    // Call DynamoDB to read the item from the table
    dbClient.getItem(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        result = data.Item;
        console.log("Success", data.Item);
      }
    });
    return Boolean(result);
}

export async function vaultUpdater (vaultsTableName: string, vault: Vault, ichiVaultStatus: boolean): Promise<DynamoResponse> {
    const params: AWS.DynamoDB.UpdateItemInput = {
        TableName: vaultsTableName,
        Key: {
          name: {
            S: vault.tableName.toLowerCase()
          }
        },
        UpdateExpression:
          'SET depositStatus = :depositStatus',
        ExpressionAttributeValues: {
          ':depositStatus': { BOOL: ichiVaultStatus }
        },
        ReturnValues: 'UPDATED_NEW'
      };
  
      try {
        // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html#API_UpdateItem_Examples
        const result = await dbClient.updateItem(params).promise();
        console.log(`Successfully updated table: ${vaultsTableName}`);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
      }
}

