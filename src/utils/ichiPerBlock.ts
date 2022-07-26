import { PartialRecord } from '@ichidao/ichi-sdk';
import { PoolNumberValues } from '@ichidao/ichi-sdk/dist/src/enums/poolNumber';
import { getAllData } from '../dynamo';

export async function getIchiPerBlock(tableName: string): Promise<PartialRecord<PoolNumberValues, number>> {
  const knownIchiPerBlock: PartialRecord<PoolNumberValues, number> = {};

  const params = {
    TableName: tableName
  };
  try {
    const results = await getAllData(params);
    for (const item of results) {
      const poolId = item['poolId']['N'];
      knownIchiPerBlock[poolId] = item['ichiPerBlock']['N'];
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }

  return knownIchiPerBlock;
}
