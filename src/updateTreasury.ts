import { updateTreasuryItem } from './updateTreasuryItem';
import { configMainnet, configKovan } from './config';
import axios from 'axios';

const lookUpTokenPrices = async function(id_array) {
  let ids = id_array.join("%2C");
  return await axios.get(
    `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${ids}&vs_currencies=usd`
  );
};

export const updateTreasury = async (tableName: string) => {
  let treasuryTokens = ['oneBTC','oneVBTC','oneWING','oneETH'];
//  let treasuryTokens = ['oneETH'];

  let ichiPrice = await lookUpTokenPrices([configMainnet.ichi]);

  for (let i = 0; i < treasuryTokens.length; i++) {
    let res = await updateTreasuryItem(tableName, treasuryTokens[i], ichiPrice.data[configMainnet.ichi].usd);

    console.log("update " + treasuryTokens[i] + " results:");
    console.log(res);
  }
};
