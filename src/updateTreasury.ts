import { updateTreasuryItem } from './updateTreasuryItem';

export const updateTreasury = async (tableName: string, tokenPrices: {[name: string]: number}, 
      tokenNames: {[name: string]: string}) => {

  let treasuryPositions = ['oneFIL', 'one1INCH', 'oneFUSE', 'oneMPH', 'onePERL', 'oneUNI', 'oneDODO', 'oneFOX', 'oneWING'];
  // let treasuryPositions = ['oneWING'];

  for (let i = 0; i < treasuryPositions.length; i++) {
    let res = await updateTreasuryItem(tableName, treasuryPositions[i], tokenPrices, tokenNames);

    console.log("update " + treasuryPositions[i] + " results:");
    console.log(res);
  }
};
