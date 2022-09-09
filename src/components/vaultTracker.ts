import { ethers } from 'ethers';
import { VaultResponse } from '../utils/lambdaTypes';
import { vaultReader, vaultUpdater } from "../utils/updateDynamo";
import { BigNumber } from '@ethersproject/bignumber';
import { getIchiVaultContract, getVaults, Vault } from "@ichidao/ichi-sdk";

const zeroBN: BigNumber = BigNumber.from(0);

async function vaultStatusTracker(urlMainetProvider: string, chainId: any): Promise<VaultResponse> {
  const mainnetProvider: any = new ethers.providers.JsonRpcProvider(urlMainetProvider);
  const vaultsTableName = process.env.MON_VAULT_TABLE_NAME || 'monitor-vaults-dev';
  var VaultObject =  getVaults(chainId);

  var result: VaultResponse = {
    address: [],
    timestamp: new Date().toISOString(),
  };

  for (let i = 0; i < VaultObject.length; i++) {
    let vault: Vault =  VaultObject[i];
    const ichiVaultInstance: any = getIchiVaultContract(vault['address'], mainnetProvider);
    var ichiVaultStatus: boolean = await vaultReader(vaultsTableName, vault);
    
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

    await vaultUpdater(vaultsTableName, vault, ichiVaultStatus);
  }

  return result;
}

export default vaultStatusTracker;
