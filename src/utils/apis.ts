import { APIS } from "../configMainnet";
import axios from 'axios';

export const callDebunkOpenAPI = async function (address: string, protocol: string) {
    let url = APIS.debunk_openapi + '?id=' + address + '&protocol_id=' + protocol;
    //console.log(url);
    return await axios.get(url);
};
  
  