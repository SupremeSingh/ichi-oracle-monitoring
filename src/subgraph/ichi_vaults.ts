import * as pkg from '@apollo/client';
import 'cross-fetch/dist/node-polyfill.js';
import * as ethers from 'ethers';
import { BigNumber } from 'ethers';
import vaultABI from '../abis/ICHI_VAULT_ABI.json';
import poolABI from '../abis/UNI_V3_POOL_ABI.json';
import xirr from 'xirr';
import { getPrice, VAULT_DECIMAL_TRACKER } from '../utils/vaults';
import { BNtoNumberWithoutDecimals } from '../utils/numbers';
import { GraphData } from './model';
import { TOKENS } from '../configMainnet';
import { APIS } from '../configMainnet';
import { APIS as POLYGON_APIS } from '../polygon/configPolygon';

const { ApolloClient, InMemoryCache, gql } = pkg;

const rangedDepositTokensQuery = `
query($first: Int, $skip:Int, $ts: Int){
  deposits(first: $first, skip: $skip, orderBy: createdAtTimestamp, where:{createdAtTimestamp_gt: $ts}){
    id
    createdAtTimestamp
    sqrtPrice
    amount0
    amount1
    totalAmount0
    totalAmount1
    totalAmount0BeforeEvent
    totalAmount1BeforeEvent
  }
}`;

const rangedWithdrawalTokens = `
query($first: Int, $skip:Int, $ts: Int){
  withdraws(first: $first, skip: $skip, orderBy: createdAtTimestamp, where:{createdAtTimestamp_gt: $ts}){
    id
    createdAtTimestamp
    sqrtPrice
    amount0
    amount1
    totalAmount0
    totalAmount1
    totalAmount0BeforeEvent
    totalAmount1BeforeEvent
  }
}
`;

const v1VaultDepositTokensQuery = `
query($first: Int, $skip: Int, $vault: String, $ts: Int){
  vaultDeposits(first: $first, skip: $skip, orderBy: createdAtTimestamp, where:{vault: $vault, createdAtTimestamp_gt: $ts}){
    id
    vault
    amount0
    amount1
    createdAtTimestamp
    sqrtPrice
    totalAmount0
    totalAmount1
    totalAmount0BeforeEvent
    totalAmount1BeforeEvent
  }
}`;

const v1VaultWithdrawTokensQuery = `
query($first: Int, $skip: Int, $vault: String, $ts: Int){
  vaultWithdraws(first: $first, skip: $skip, orderBy: createdAtTimestamp, where:{vault: $vault, createdAtTimestamp_gt: $ts}){
    id
    vault
    amount0
    amount1
    createdAtTimestamp
    sqrtPrice
    totalAmount0
    totalAmount1
    totalAmount0BeforeEvent
    totalAmount1BeforeEvent
  }
}`;

export async function vault_graph_query(
  page: number,
  isDeposit: boolean,
  irrStartDate: Date,
  vault_address: String,
  network: 'mainnet' | 'polygon'
) {
  let endpoint;

  switch (network) {
    case 'mainnet':
      endpoint = APIS.subgraph_v1_mainnet;
      break;
    case 'polygon':
      endpoint = POLYGON_APIS.subgraph_v1_polygon;
  }

  const tokensQuery = isDeposit ? v1VaultDepositTokensQuery : v1VaultWithdrawTokensQuery;

  const client = new ApolloClient({
    uri: endpoint,
    cache: new InMemoryCache()
  });
  try {
    return await client.query({
      query: gql(tokensQuery),
      variables: {
        first: 1000,
        skip: (page - 1) * 1000,
        vault: vault_address,
        ts: Math.ceil(irrStartDate.getTime() / 1000)
      }
    });
  } catch (error) {
    console.log('error: vault subgraph is not available');
    return false;
  }
}

export type DataPacket = {
  data: GraphData;
  type: 'deposit' | 'withdrawal';
};

type VerboseTransaction = {
  date: Date;
  oneTokenAmount: number;
  scarceTokenAmount: number;
  price: number;
  oneTokenTotalAmount: number;
  scarceTokenTotalAmount: number;
  oneTokenTotalAmountBeforeEvent: number;
  scarceTokenTotalAmountBeforeEvent: number;
  type: 'deposit' | 'withdrawal';
};

type DistilledTransaction = {
  amount: number;
  when: Date;
};

type DecimalsObject = {
  baseToken: number;
  scarceToken: number;
};

export class Vault {
  vaultName: string;
  vaultEndpoint: string;
  vaultAddress: string;
  amountsInverted: boolean;
  decimals: DecimalsObject;
  dataPackets: DataPacket[];
  verboseTransactions: VerboseTransaction[] = [];
  distilledTransactions: DistilledTransaction[] = [];
  currentVaultValue: number;
  cutOffDate: Date;
  APR: number;
  IRR: number;
  provider: ethers.providers.JsonRpcProvider;

  constructor(
    vaultName: string,
    vaultAddress: string,
    vaultEndpoint: string,
    data: DataPacket[],
    isInverted: boolean,
    cutOffDate: Date,
    provider: ethers.providers.JsonRpcProvider
  ) {
    this.provider = provider;
    this.vaultName = vaultName;
    this.vaultEndpoint = vaultEndpoint;
    this.vaultAddress = vaultAddress;
    this.amountsInverted = isInverted;
    this.decimals = VAULT_DECIMAL_TRACKER[vaultName];
    this.dataPackets = data;
    this.cutOffDate = cutOffDate;
    this.verboseTransactions = getVerboseTransactions(
      this.dataPackets,
      this.amountsInverted,
      this.decimals.baseToken,
      this.decimals.scarceToken
    );
    this.distilledTransactions = getDistilledTransactions(this.verboseTransactions, this.cutOffDate);
    this.calcCurrentValue();
  }

  public async calcCurrentValue() {
    const value = await getCurrentVaultValue(
      this.vaultAddress,
      this.amountsInverted,
      this.decimals.baseToken,
      this.decimals.scarceToken,
      this.provider
    );

    this.currentVaultValue = value;
  }

  public async getAPR() {
    let deposits = 0;
    let withdrawals = 0;
    const transactions = this.distilledTransactions;
    const currentVaultValue = this.currentVaultValue;
    const numTransactions = transactions.length;
    const millisecondsToYears = 1000 * 60 * 60 * 24 * 365;
    const vaultTimeYears =
      (transactions[numTransactions - 1].when.getTime() - transactions[0].when.getTime()) / millisecondsToYears;

    for (const transaction of transactions) {
      const amount = transaction.amount;
      amount < 0 ? (deposits += amount) : (withdrawals += amount);
    }

    this.APR = (((withdrawals + currentVaultValue) / -deposits) * 100 - 100) / vaultTimeYears;
    // console.log(`The APR of the ${this.vaultName} vault is: ${this.APR}`)
    if (this.APR > -0.01 && this.APR < 0.01) {
      this.APR = 0;
    }
    if (this.APR < 0) {
      this.APR = 0;
    }
  }

  public async getIRR(irrStartDate: Date, irrStartTxAmount: number) {
    let xirrObjArray = this.distilledTransactions;
    let firstTxDate = new Date();

    // Transactions earlier than irrStartDate are removed.
    // First big transaction amount (made on irrStartDate) is replaced with irrStartTxAmount.
    if (irrStartDate.toDateString() !== (new Date(0)).toDateString()) {
      firstTxDate = irrStartDate;
      xirrObjArray = xirrObjArray.filter((tx) => {
        const currTxDate = new Date(tx.when);
        return currTxDate >= firstTxDate;
      });
      // replace first tx amount
      if (irrStartTxAmount !== 0) {
          xirrObjArray = xirrObjArray.map((tx) => {
          const currTxDate = new Date(tx.when);
          if (currTxDate.getTime() === firstTxDate.getTime()) {
            return { amount: -irrStartTxAmount, when: tx.when };
          } else {
            return { amount: tx.amount, when: tx.when };
          }
        });
      }
    }

    xirrObjArray.push({ amount: this.currentVaultValue, when: new Date(Date.now()) });

    //console.log(xirrObjArray);

    let irr = 0;
    try {
      irr = xirr(xirrObjArray, { guess: -0.9975 });
    } catch (error) {
      console.error(`Error calculating IRR for ${this.vaultName}: ${error}`);
    }
    this.IRR = irr * 100;
    // console.log(`The IRR of the ${this.vaultName} vault is: `,irr)
    if (this.IRR > -0.01 && this.IRR < 0.01) {
      this.IRR = 0;
    }
    if (this.IRR < 0) {
      this.IRR = 0;
    }
    return this.IRR;
  }

  public async getDateRangeDistilled(milliseconds: number): Promise<DistilledTransaction[]> {
    const cutoff = Date.now() - milliseconds;
    if (cutoff <= this.distilledTransactions[0].when.getTime()) {
      return this.distilledTransactions;
    } else {
      const rangedDistilledTransactions: DistilledTransaction[] = [];
      for (const distilledTransactionObjectInstance of this.distilledTransactions) {
        if (cutoff <= distilledTransactionObjectInstance.when.getTime()) {
          rangedDistilledTransactions.push(distilledTransactionObjectInstance);
        }
      }
      return rangedDistilledTransactions;
    }
  }
}

function getVerboseTransactions(
  dataPackets: DataPacket[],
  amountsInverted: boolean,
  baseTokenDecimals: number,
  scarceTokenDecimals: number
): VerboseTransaction[] {
  let isDeposit: boolean;
  const verboseTransactions: VerboseTransaction[] = [];
  let packetData: any[];
  for (const packet of dataPackets) {
    if (packet.type == 'deposit') {
      isDeposit = true;
      packetData = packet.data.data['vaultDeposits'];
    } else {
      isDeposit = false;
      packetData = packet.data.data['vaultWithdraws'];
    }
    for (const transaction of packetData) {
      const date = new Date(transaction.createdAtTimestamp * 1000);
      const oneTokenAmount = amountsInverted
        ? BNtoNumberWithoutDecimals(transaction['amount1'], baseTokenDecimals)
        : BNtoNumberWithoutDecimals(transaction['amount0'], baseTokenDecimals);
      const scarceTokenAmount = amountsInverted
        ? BNtoNumberWithoutDecimals(transaction['amount0'], scarceTokenDecimals)
        : BNtoNumberWithoutDecimals(transaction['amount1'], scarceTokenDecimals);

      let price = getPrice(
        amountsInverted,
        BigNumber.from(transaction['sqrtPrice']),
        baseTokenDecimals,
        scarceTokenDecimals
      );
      price = isDeposit ? -price : price;

      const oneTokenTotalAmount = amountsInverted
        ? BNtoNumberWithoutDecimals(transaction['totalAmount1'], baseTokenDecimals)
        : BNtoNumberWithoutDecimals(transaction['totalAmount0'], baseTokenDecimals);
      const scarceTokenTotalAmount = amountsInverted
        ? BNtoNumberWithoutDecimals(transaction['totalAmount0'], scarceTokenDecimals)
        : BNtoNumberWithoutDecimals(transaction['totalAmount1'], scarceTokenDecimals);

      const oneTokenTotalAmountBeforeEvent = amountsInverted
        ? BNtoNumberWithoutDecimals(transaction['totalAmount1BeforeEvent'], baseTokenDecimals)
        : BNtoNumberWithoutDecimals(transaction['totalAmount0BeforeEvent'], baseTokenDecimals);
      const scarceTokenTotalAmountBeforeEvent = amountsInverted
        ? BNtoNumberWithoutDecimals(transaction['totalAmount0BeforeEvent'], scarceTokenDecimals)
        : BNtoNumberWithoutDecimals(transaction['totalAmount1BeforeEvent'], scarceTokenDecimals);

      const type = packet.type;

      const holder: VerboseTransaction = {
        date: date,
        oneTokenAmount: oneTokenAmount,
        scarceTokenAmount: scarceTokenAmount,
        price: price,
        oneTokenTotalAmount: oneTokenTotalAmount,
        scarceTokenTotalAmount: scarceTokenTotalAmount,
        oneTokenTotalAmountBeforeEvent: oneTokenTotalAmountBeforeEvent,
        scarceTokenTotalAmountBeforeEvent: scarceTokenTotalAmountBeforeEvent,
        type: type
      };

      verboseTransactions.push(holder);
    }
    isDeposit = false;
  }

  verboseTransactions.sort(compare);
  return verboseTransactions;
}

function getDistilledTransactions(verboseTransactions: VerboseTransaction[], cutOffDate: Date): DistilledTransaction[] {
  const distilledTransactions: DistilledTransaction[] = [];

  //aggregates the transactions before the IRR start date
  const aggregateOneToken = verboseTransactions[0].oneTokenTotalAmountBeforeEvent;
  const aggregateScarceToken = verboseTransactions[0].scarceTokenTotalAmountBeforeEvent;
  const aggregateAmount = aggregateOneToken + aggregateScarceToken * verboseTransactions[0].price;
  const aggregateHolder: DistilledTransaction = {
    amount: -aggregateAmount,
    when: cutOffDate
  };
  distilledTransactions.push(aggregateHolder);

  for (const transaction of verboseTransactions) {
    let dollarAmount = getDollarAmount(transaction);
    if (transaction.type == 'deposit') {
      dollarAmount = -dollarAmount;
    }
    const holder: DistilledTransaction = {
      amount: dollarAmount,
      when: transaction.date
    };
    distilledTransactions.push(holder);
  }

  return distilledTransactions;
}

function getDollarAmount(transaction: VerboseTransaction): number {
  const oneTokenAmount = transaction.oneTokenAmount;
  const scarceTokenAmount = transaction.scarceTokenAmount;
  const price = transaction.price;

  return oneTokenAmount + price * scarceTokenAmount;
}

function compare(a, b) {
  if (a['date'] > b['date']) {
    return 1;
  } else if (b['date'] > a['date']) {
    return -1;
  } else {
    return 0;
  }
}

export async function getVaultPoolAddress(
  vaultAddress: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<string> {
  const vaultContract = new ethers.Contract(vaultAddress, vaultABI, provider);
  const poolAddress: string = await vaultContract.pool();
  return poolAddress;
}

export async function getCurrentVaultValue(
  vaultAddress: string,
  amountsInverted: boolean,
  baseTokenDecimals: number,
  scarceTokenDecimals: number,
  provider: ethers.providers.JsonRpcProvider
): Promise<number> {
  //get Current Balance
  const vaultContract = new ethers.Contract(vaultAddress, vaultABI, provider);
  const totalAmountArray = await vaultContract.getTotalAmounts();

  const unformattedTotalBaseTokenAmount = amountsInverted ? totalAmountArray[1] : totalAmountArray[0];
  const unformattedTotalScarceTokenAmount = amountsInverted ? totalAmountArray[0] : totalAmountArray[1];
  const totalBaseTokenAmount = BNtoNumberWithoutDecimals(unformattedTotalBaseTokenAmount.toString(), baseTokenDecimals);
  const totalScarceTokenAmount = BNtoNumberWithoutDecimals(
    unformattedTotalScarceTokenAmount.toString(),
    scarceTokenDecimals
  );

  //get Current Price
  const poolAddress: string = await vaultContract.pool();
  const poolContract = new ethers.Contract(poolAddress, poolABI, provider);
  const slot0 = await poolContract.slot0();

  const sqrtPrice = slot0[0];
  const price = getPrice(amountsInverted, sqrtPrice, baseTokenDecimals, scarceTokenDecimals);

  const currentVaultValue = totalBaseTokenAmount + price * totalScarceTokenAmount;
  return currentVaultValue;
}

export async function getOneTokenPriceFromVault(
  name: string,
  ichi_price: number,
  provider: ethers.providers.JsonRpcProvider
): Promise<number> {
  let vaultAddress = '';
  let inverted = true;
  if (name == 'onebtc') {
    vaultAddress = TOKENS.onebtc.ichiVault.address;
  }
  if (name == 'oneuni') {
    vaultAddress = TOKENS.oneuni.ichiVault.address;
    inverted = false;
  }

  const vaultContract = new ethers.Contract(vaultAddress, vaultABI, provider);

  const poolAddress: string = await vaultContract.pool();

  if (vaultAddress == '') return 1;

  const poolContract = new ethers.Contract(poolAddress, poolABI, provider);
  const slot0 = await poolContract.slot0();

  const sqrtPrice = slot0[0];
  const price = getPrice(inverted, sqrtPrice, 18, 9, 5);
  //console.log(price);
  //console.log(ichi_price / price);

  return ichi_price / price;
}
