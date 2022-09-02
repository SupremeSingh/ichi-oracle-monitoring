import * as dotenv from "dotenv";
import ethers from "ethers";
import { VaultResponse } from "../types";
import VaultArtifact from "../../builds/ichiVault.json";
import { BigNumber } from "@ethersproject/bignumber"

dotenv.config({ path: '../.env' });

var urlMainetProvider: string = "https://web3.dappnode.net";
const zeroBN: BigNumber = BigNumber.from(0);

var depositMaxStatus: any = {
  "0x683F081DBC729dbD34AbaC708Fa0B390d49F1c39": 1,
  "0x8abb986fB2C72aBc5a08f4D34BaF15279Dd5581F": 1,	
  "0x913b7D91e019402233d2f75863133925CE658CD9": 1,	
};

async function vaultStatusTracker () {
  const mainnetProvider: any = new ethers.providers.JsonRpcProvider(
    urlMainetProvider
  );

  var result: VaultResponse = {
    "address": [],
    "timestamp": new Date().toISOString(),
  };

  for(var address in depositMaxStatus) {
    const ichiVaultInstance: any = new ethers.Contract(address, VaultArtifact, mainnetProvider);
    
    var deposit0Max: BigNumber = await ichiVaultInstance.deposit0Max();
    var deposit1Max: BigNumber = await ichiVaultInstance.deposit1Max();
    
    if (zeroBN.eq(deposit0Max) && zeroBN.eq(deposit1Max)) {
      if (depositMaxStatus[address] == 1) {
        result["address"].push(address);
      }
      depositMaxStatus[address] = 0;
    } else {
      depositMaxStatus[address] = 1;
    }
  }
  return result;
};

export default vaultStatusTracker;