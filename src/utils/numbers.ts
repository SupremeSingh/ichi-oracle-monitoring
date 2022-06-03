export function BNtoNumberWithoutDecimals(val: string, decimals: number): number {
  if (val != null) {
    const digits = val.length;
    let tempVal = '';
    if (digits <= decimals) {
      tempVal = '0.';
      for (let i = 0; i < decimals - digits; i++) {
        tempVal = `${tempVal}0`;
      }
      tempVal = `${tempVal}${val}`;
    } else {
      for (let i = 0; i < digits - decimals; i++) {
        tempVal = `${tempVal}${val[i]}`;
      }
      tempVal = `${tempVal}.`;
      for (let i = digits - decimals; i < digits; i++) {
        tempVal = `${tempVal}${val[i]}`;
      }
    }
    return Number(tempVal);
  }
  return 0;
}
