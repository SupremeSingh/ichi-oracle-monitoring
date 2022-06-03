import univ3prices from '@thanpolas/univ3prices';
import { BigNumber } from 'ethers';

export const VAULT_DECIMAL_TRACKER = {
  ichi: { baseToken: 18, scarceToken: 9 },
  'usdc-ichi': { baseToken: 6, scarceToken: 18 },
  oneichi: { baseToken: 18, scarceToken: 18 },
  fuse: { baseToken: 18, scarceToken: 18 },
  wing: { baseToken: 18, scarceToken: 9 },
  oja: { baseToken: 18, scarceToken: 18 },
  gno: { baseToken: 18, scarceToken: 9 },
  gno_v2: { baseToken: 18, scarceToken: 18 },
  cel: { baseToken: 4, scarceToken: 9 },
  cel_v2: { baseToken: 4, scarceToken: 18 },
  wbtc: { baseToken: 8, scarceToken: 9 },
  wbtc_v2: { baseToken: 8, scarceToken: 18 },
  polygon_wbtc: { baseToken: 8, scarceToken: 18 },
  onebtc: { baseToken: 18, scarceToken: 9 },
  polygon_onebtc: { baseToken: 18, scarceToken: 18 },
  polygon_usdc: { baseToken: 6, scarceToken: 18 },
  wnxm: { baseToken: 18, scarceToken: 9 },
  wnxm_v2: { baseToken: 18, scarceToken: 18 },
  qrdo: { baseToken: 6, scarceToken: 8 },
  fox: { baseToken: 18, scarceToken: 18 }
};

// calculate price/ratio in the pool
export function getPrice(
  isInverted: boolean,
  sqrtPrice: BigNumber,
  decimals0: number,
  decimals1: number,
  decimalPlaces = 3
): number {
  let decimalArray = [decimals0, decimals1];
  if (isInverted) {
    decimalArray = [decimals1, decimals0];
  }
  const price = univ3prices(decimalArray, sqrtPrice).toSignificant({
    reverse: isInverted,
    decimalPlaces: decimalPlaces
  });

  return price;
}
