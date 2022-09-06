import { ethers } from 'ethers';
import { VaultResponse } from '../utils/lambdaTypes';
import { BigNumber } from '@ethersproject/bignumber';
import { getIchiVaultContract, getVaults } from "@ichidao/ichi-sdk";

const zeroBN: BigNumber = BigNumber.from(0);

async function vaultStatusTracker(urlMainetProvider: string, chainId: any): Promise<VaultResponse> {
  const mainnetProvider: any = new ethers.providers.JsonRpcProvider(urlMainetProvider);
  var VaultObject =  getVaults(chainId);

  var result: VaultResponse = {
    address: [],
    timestamp: new Date().toISOString(),
  };

  for (var vault in VaultObject) {
    const ichiVaultInstance: any = getIchiVaultContract(vault['address'], mainnetProvider);
    var ichiVaultStatus: boolean = vault['depositStatus']
    
    var deposit0Max: BigNumber;
    var deposit1Max: BigNumber;
    
    try {
      deposit0Max = await ichiVaultInstance.deposit0Max();
      deposit1Max = await ichiVaultInstance.deposit1Max();
    } catch (error) {
      console.error(error);
    }

    if (zeroBN.eq(deposit0Max) && zeroBN.eq(deposit1Max)) {
      if (ichiVaultStatus == false) {
        result['address'].push(vault['address']);
      }
      ichiVaultStatus = false;
    } else {
      ichiVaultStatus = true;
    }
  }
  return result;
}

export default vaultStatusTracker;
