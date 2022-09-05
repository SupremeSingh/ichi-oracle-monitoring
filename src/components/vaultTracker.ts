import { ethers } from 'ethers';
import { VaultResponse } from '../utils/lambdaTypes';
import VaultArtifact from '../../builds/ichiVault.json';
import { BigNumber } from '@ethersproject/bignumber';

const zeroBN: BigNumber = BigNumber.from(0);

async function vaultStatusTracker(urlMainetProvider: string, VaultObject: any): Promise<VaultResponse> {
  const mainnetProvider: any = new ethers.providers.JsonRpcProvider(urlMainetProvider);

  var result: VaultResponse = {
    address: [],
    timestamp: new Date().toISOString(),
  };

  for (var address in VaultObject) {
    const ichiVaultInstance: any = new ethers.Contract(address, VaultArtifact, mainnetProvider);

    try {
      var deposit0Max: BigNumber = await ichiVaultInstance.deposit0Max();
      var deposit1Max: BigNumber = await ichiVaultInstance.deposit1Max();
    } catch (error) {
      console.error(error);
    }

    if (zeroBN.eq(deposit0Max) && zeroBN.eq(deposit1Max)) {
      if (VaultObject[address] == 1) {
        result['address'].push(address);
      }
      VaultObject[address] = 0;
    } else {
      VaultObject[address] = 1;
    }
  }
  return result;
}

export default vaultStatusTracker;
