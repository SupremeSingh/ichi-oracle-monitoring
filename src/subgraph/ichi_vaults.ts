import * as pkg from '@apollo/client';
import 'cross-fetch/dist/node-polyfill.js';
import { BigNumber } from 'ethers';
import xirr from 'xirr';
import { GraphData } from './model';
import {
  Apis,
  getPrice,
  bnToNumberWithoutDecimals,
  ChainId,
  getToken,
  TokenName,
  getVault,
  VaultName,
  getIchiVaultContract,
  getUniswapV3PoolContract
} from '@ichidao/ichi-sdk';
import { JsonRpcProvider } from '@ethersproject/providers';

const { ApolloClient, InMemoryCache, gql } = pkg;

// const rangedDepositTokensQuery = `
// query($first: Int, $skip:Int, $ts: Int){
//   deposits(first: $first, skip: $skip, orderBy: createdAtTimestamp, where:{createdAtTimestamp_gt: $ts}){
//     id
//     createdAtTimestamp
//     sqrtPrice
//     amount0
//     amount1
//     totalAmount0
//     totalAmount1
//     totalAmount0BeforeEvent
//     totalAmount1BeforeEvent
//   }
// }`;

// const rangedWithdrawalTokens = `
// query($first: Int, $skip:Int, $ts: Int){
//   withdraws(first: $first, skip: $skip, orderBy: createdAtTimestamp, where:{createdAtTimestamp_gt: $ts}){
//     id
//     createdAtTimestamp
//     sqrtPrice
//     amount0
//     amount1
//     totalAmount0
//     totalAmount1
//     totalAmount0BeforeEvent
//     totalAmount1BeforeEvent
//   }
// }
// `;

const v1VaultDepositTokensQuery = `
query($first: Int, $skip: Int, $vault: String, $ts: Int){
  vaultDeposits(first: $first, skip: $skip, orderBy: createdAtTimestamp, where:{vault: $vault, createdAtTimestamp_gt: $ts}){
    id
    vault
    amount0
    amount1
    createdAtTimestamp
    sqrtPrice
    sender
    shares
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
    sender
    shares
    totalAmount0
    totalAmount1
    totalAmount0BeforeEvent
    totalAmount1BeforeEvent
  }
}`;

export async function vaultGraphQuery(
  page: number,
  isDeposit: boolean,
  irrStartDate: Date,
  vault_address: String,
  network: 'mainnet' | 'polygon'
) {
  let endpoint: string;

  switch (network) {
    case 'mainnet':
      endpoint = Apis.SUBGRAPH_V1_MAINNET;
      break;
    case 'polygon':
      endpoint = Apis.SUBGRAPH_V1_POLYGON;
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
  id: string;
  date: Date;
  oneTokenAmount: number;
  scarceTokenAmount: number;
  price: number;
  account: string;
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

interface UserStates {
  [account: string]: UserStateInVault;
}

type UserStateInVault = {
  isGone: boolean;
  sharesIn: number;
  sharesOut: number;
  sharesCurrent: number;
  transactionsToSkip: string[];
  transactionsToKeep: string[];
};

export class Vault {
  vaultName: VaultName;
  vaultEndpoint: string;
  vaultAddress: string;
  amountsInverted: boolean;
  dataPackets: DataPacket[];
  verboseTransactions: VerboseTransaction[] = [];
  distilledTransactions: DistilledTransaction[] = [];
  userStatesInVault: UserStates;
  currentVaultValue: number;
  cutOffDate: Date;
  APR: number;
  IRR: number;
  provider: JsonRpcProvider;

  constructor(
    vaultName: VaultName,
    vaultAddress: string,
    vaultEndpoint: string,
    data: DataPacket[],
    isInverted: boolean,
    cutOffDate: Date,
    provider: JsonRpcProvider
  ) {
    this.provider = provider;
    this.vaultName = vaultName;
    this.vaultEndpoint = vaultEndpoint;
    this.vaultAddress = vaultAddress;
    this.amountsInverted = isInverted;
    this.dataPackets = data;
    this.cutOffDate = cutOffDate;

    // check which users are still in the vault and which one already withdrew
    this.userStatesInVault = getUserStateInVault(this.dataPackets);
    //console.log(vaultName + ' : ' + JSON.stringify(this.userStatesInVault));

    const vault = getVault(vaultName, provider.network.chainId);

    this.verboseTransactions = getVerboseTransactions(
      this.dataPackets,
      this.amountsInverted,
      // this.decimals.baseToken,
      // this.decimals.scarceToken
      vault.baseTokenDecimals,
      vault.scarceTokenDecimals
    );
    this.distilledTransactions = getDistilledTransactions(
      this.verboseTransactions,
      this.cutOffDate,
      this.userStatesInVault
    );
    this.calcCurrentValue();
  }

  public async calcCurrentValue() {
    const vault = getVault(this.vaultName, this.provider.network.chainId);
    const value = await getCurrentVaultValue(
      this.vaultAddress,
      this.amountsInverted,
      vault.baseTokenDecimals,
      vault.scarceTokenDecimals,
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
    if (irrStartDate.toDateString() !== new Date(0).toDateString()) {
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

function getUserStateInVault(dataPackets: DataPacket[]): UserStates {
  let isDeposit: boolean;
  const userStates: UserStates = {};
  let packetData: any[] = [];
  for (const packet of dataPackets) {
    if (packet.type == 'deposit') {
      packetData = packetData.concat(packet.data.data['vaultDeposits']);
    } else {
      packetData = packetData.concat(packet.data.data['vaultWithdraws']);
    }
  }
  packetData.sort((a, b) => Number(a.createdAtTimestamp) - Number(b.createdAtTimestamp));

  //console.log(JSON.stringify(packetData))
  for (const transaction of packetData) {
    if (transaction['__typename'] == 'VaultDeposit') {
      isDeposit = true;
    } else {
      isDeposit = false;
    }
    const account = transaction['sender'];
    const shares = bnToNumberWithoutDecimals(transaction['shares'], 18);

    if (userStates[account]) {
      userStates[account].transactionsToKeep.push(transaction['id']);
      if (isDeposit) {
        userStates[account].sharesIn += shares;
        userStates[account].sharesCurrent += shares;
      } else {
        userStates[account].sharesOut += shares;
        userStates[account].sharesCurrent -= shares;
      }
      userStates[account].isGone =
        userStates[account].sharesIn == 0 || userStates[account].sharesCurrent / userStates[account].sharesIn < 0.001;

      if (userStates[account].isGone) {
        userStates[account].transactionsToSkip = userStates[account].transactionsToSkip.concat(
          userStates[account].transactionsToKeep
        );
        userStates[account].transactionsToKeep = [];
      }
    } else {
      if (isDeposit) {
        const userState: UserStateInVault = {
          sharesIn: shares,
          sharesOut: 0,
          sharesCurrent: shares,
          transactionsToSkip: [],
          transactionsToKeep: [transaction['id']],
          isGone: false
        };
        userStates[account] = userState;
      } else {
        const userState: UserStateInVault = {
          sharesIn: 0,
          sharesOut: shares,
          sharesCurrent: -shares,
          transactionsToSkip: [],
          transactionsToKeep: [transaction['id']],
          isGone: false
        };
        userStates[account] = userState;
      }
    }
  }

  //console.log(JSON.stringify(userStates))

  return userStates;
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
        ? bnToNumberWithoutDecimals(transaction['amount1'], baseTokenDecimals)
        : bnToNumberWithoutDecimals(transaction['amount0'], baseTokenDecimals);
      const scarceTokenAmount = amountsInverted
        ? bnToNumberWithoutDecimals(transaction['amount0'], scarceTokenDecimals)
        : bnToNumberWithoutDecimals(transaction['amount1'], scarceTokenDecimals);

      let price = getPrice(
        amountsInverted,
        BigNumber.from(transaction['sqrtPrice']),
        baseTokenDecimals,
        scarceTokenDecimals
      );
      price = isDeposit ? -price : price;

      const oneTokenTotalAmount = amountsInverted
        ? bnToNumberWithoutDecimals(transaction['totalAmount1'], baseTokenDecimals)
        : bnToNumberWithoutDecimals(transaction['totalAmount0'], baseTokenDecimals);
      const scarceTokenTotalAmount = amountsInverted
        ? bnToNumberWithoutDecimals(transaction['totalAmount0'], scarceTokenDecimals)
        : bnToNumberWithoutDecimals(transaction['totalAmount1'], scarceTokenDecimals);

      const oneTokenTotalAmountBeforeEvent = amountsInverted
        ? bnToNumberWithoutDecimals(transaction['totalAmount1BeforeEvent'], baseTokenDecimals)
        : bnToNumberWithoutDecimals(transaction['totalAmount0BeforeEvent'], baseTokenDecimals);
      const scarceTokenTotalAmountBeforeEvent = amountsInverted
        ? bnToNumberWithoutDecimals(transaction['totalAmount0BeforeEvent'], scarceTokenDecimals)
        : bnToNumberWithoutDecimals(transaction['totalAmount1BeforeEvent'], scarceTokenDecimals);

      const type = packet.type;

      const holder: VerboseTransaction = {
        id: transaction['id'],
        date: date,
        oneTokenAmount: oneTokenAmount,
        scarceTokenAmount: scarceTokenAmount,
        price: price,
        account: transaction['sender'],
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

function getDistilledTransactions(
  verboseTransactions: VerboseTransaction[],
  cutOffDate: Date,
  userStates: UserStates
): DistilledTransaction[] {
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
    // skip transactions from user who withdrew
    if (userStates[transaction.account].transactionsToSkip.includes(transaction.id)) continue;
    // if (userStates[transaction["account"]].isGone) continue;

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

function compare(a: { date: Date }, b: { date: Date }) {
  if (a['date'] > b['date']) {
    return 1;
  } else if (b['date'] > a['date']) {
    return -1;
  } else {
    return 0;
  }
}

export async function getVaultPoolAddress(vaultAddress: string, provider: JsonRpcProvider): Promise<string> {
  const vaultContract = getIchiVaultContract(vaultAddress, provider);
  const poolAddress: string = await vaultContract.pool();
  return poolAddress;
}

export async function getCurrentVaultValue(
  vaultAddress: string,
  amountsInverted: boolean,
  baseTokenDecimals: number,
  scarceTokenDecimals: number,
  provider: JsonRpcProvider
): Promise<number> {
  //get Current Balance
  const vaultContract = getIchiVaultContract(vaultAddress, provider);
  const totalAmountArray = await vaultContract.getTotalAmounts();

  const unformattedTotalBaseTokenAmount = amountsInverted ? totalAmountArray[1] : totalAmountArray[0];
  const unformattedTotalScarceTokenAmount = amountsInverted ? totalAmountArray[0] : totalAmountArray[1];
  const totalBaseTokenAmount = bnToNumberWithoutDecimals(unformattedTotalBaseTokenAmount.toString(), baseTokenDecimals);
  const totalScarceTokenAmount = bnToNumberWithoutDecimals(
    unformattedTotalScarceTokenAmount.toString(),
    scarceTokenDecimals
  );

  //get Current Price
  const poolAddress: string = await vaultContract.pool();
  const poolContract = getUniswapV3PoolContract(poolAddress, provider);
  const slot0 = await poolContract.slot0();

  const sqrtPrice = slot0[0];
  const price = getPrice(amountsInverted, sqrtPrice, baseTokenDecimals, scarceTokenDecimals);

  const currentVaultValue = totalBaseTokenAmount + price * totalScarceTokenAmount;
  return currentVaultValue;
}

export async function getOneTokenPriceFromVault(
  name: TokenName,
  ichi_price: number,
  provider: JsonRpcProvider,
  chainId: ChainId
): Promise<number> {
  let vaultAddress = '';
  let inverted = true;
  let ichiDecimals = 9;
  if (name == TokenName.ONE_BTC) {
    vaultAddress = getToken(TokenName.ONE_BTC, chainId).ichiVault.address;
  }
  if (name == TokenName.ALLY) {
    vaultAddress = getVault(VaultName.ALLY, chainId).address;
    ichiDecimals = 18;
  }
  if (name == TokenName.ONE_UNI) {
    vaultAddress = getToken(TokenName.ONE_UNI, chainId).ichiVault.address;
    inverted = false;
  }

  const vaultContract = getIchiVaultContract(vaultAddress, provider);

  const poolAddress: string = await vaultContract.pool();

  if (vaultAddress == '') return 1;

  const poolContract = getUniswapV3PoolContract(poolAddress, provider);
  const slot0 = await poolContract.slot0();

  const sqrtPrice = slot0[0];
  const price = getPrice(inverted, sqrtPrice, 18, ichiDecimals, 5);
  //console.log(price);
  //console.log(ichi_price / price);

  return ichi_price / price;
}
