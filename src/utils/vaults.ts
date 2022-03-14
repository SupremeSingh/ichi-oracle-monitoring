import univ3prices from '@thanpolas/univ3prices';
import { BigNumber } from 'ethers';

export const VAULT_DECIMAL_TRACKER={
    "ichi": {baseToken:18, scarceToken:9},
    "fuse": {baseToken:18, scarceToken:18},
    "wing": {baseToken:18, scarceToken:9},
    "oja": {baseToken:18, scarceToken:18},
    "gno": {baseToken:18, scarceToken:9},
    "cel": {baseToken:4, scarceToken:9},
    "fox": {baseToken:18, scarceToken:18}
}  

// calculate price/ratio in the pool
export function getPrice(
        isInverted: boolean, 
        sqrtPrice: BigNumber, 
        decimals0: number, 
        decimals1: number,
        decimalPlaces: number = 3) : number {
    let decimalArray = [decimals0, decimals1]
    let price = univ3prices(decimalArray, sqrtPrice).toSignificant({
        reverse: isInverted,
        decimalPlaces: decimalPlaces
    });

    return price;
}