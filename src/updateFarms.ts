import { updateFarm } from './updateFarm';
import { configMainnet, configKovan, pools } from './config';
import axios from 'axios';

const lookUpTokenPrices = async function(id_array) {
  let ids = id_array.join("%2C");
  return await axios.get(
    `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${ids}&vs_currencies=usd`
  );
};

export const updateFarms = async (tableName: string) => {
  let ichiPrice = await lookUpTokenPrices([configMainnet.ichi]);

  for (let i = 0; i < pools.activePools.length; i++) {
    let res = await updateFarm(tableName, pools.activePools[i], ichiPrice.data[configMainnet.ichi].usd);

    console.log("update " + pools.activePools[i] + " results:");
    console.log(res);
  }
};
