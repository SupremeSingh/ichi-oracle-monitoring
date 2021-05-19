import { updateToken } from './updateToken';
import { configMainnet, configKovan, tokens } from './config';
import axios from 'axios';

export const updateTokens = async (tableName: string) => {
  for (const token in tokens) {  
    let res = await updateToken(tableName, token);

    console.log("update " + token + " results:");
    console.log(res);
  }
};
