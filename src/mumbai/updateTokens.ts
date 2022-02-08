import { updateToken } from './updateToken';
import { TOKENS } from './configMumbai';

export const updateTokens = async (tableName: string) => {
  for (const token in TOKENS) {  
    let res = await updateToken(tableName, token);

    console.log("update " + token + " results:");
    console.log(res);
  }
};