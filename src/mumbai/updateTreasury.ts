import { ChainId, TokenName } from '@ichidao/ichi-sdk';
import { updateTreasuryItem } from './updateTreasuryItem';

export const updateTreasury = async (tableName: string, tokenPrices: { [name: string]: number }, chainId: ChainId) => {
  const treasuryPositions = [TokenName.ONE_BTC];

  for (const tokenName of treasuryPositions) {
    let res = await updateTreasuryItem(tableName, tokenName, tokenPrices, chainId);

    console.log(`update ${tokenName} results:`);
    console.log(res);
  }
};
