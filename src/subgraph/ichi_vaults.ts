import * as pkg from '@apollo/client';
import 'cross-fetch/dist/node-polyfill.js';
import * as ethers from 'ethers'
import { BigNumber } from 'ethers';
import vaultABI from '../abis/ICHI_VAULT_ABI.json';
import poolABI from '../abis/UNI_V3_POOL_ABI.json'
import xirr from 'xirr'
import { getPrice, VAULT_DECIMAL_TRACKER } from '../utils/vaults';
import { BNtoNumberWithoutDecimals } from '../utils/numbers';
import { GraphData } from './model';

const { ApolloClient, InMemoryCache, gql } = pkg;

const depositTokensQuery = `
    query($first: Int, $skip:Int) {
        deposits (first: $first, skip: $skip, orderBy: createdAtTimestamp, orderDirection: desc) {
            id
            amount0
            amount1
            createdAtTimestamp
            sqrtPrice
            totalAmount0
            totalAmount1
        }
    }
`

const withdrawalTokensQuery = `
    query($first: Int, $skip:Int) {
        withdraws (first: $first, skip: $skip, orderBy: createdAtTimestamp, orderDirection: desc) {
            id
            amount0
            amount1
            createdAtTimestamp
            sqrtPrice
            totalAmount0
            totalAmount1
        }
    }
`

export async function vault_graph_query(endpoint: string, page: number, isDeposit: boolean) {
    let tokensQuery = isDeposit ? depositTokensQuery : withdrawalTokensQuery
    var client = new ApolloClient({
        uri: endpoint,
        cache: new InMemoryCache(),
    })
    try {
        return await client.query({
            query: gql(tokensQuery),
            variables: {
                first: 10,
                skip: (page-1)*10,
            },
        })
    } catch (error) {
        console.log("error: vault subgraph is not available");
        return false
    }
}

export type DataPacket = {
    data: GraphData,
    type: 'deposit' | 'withdrawal'
}

type VerboseTransaction = {
    'date': Date,
    'oneTokenAmount': number,
    'scarceTokenAmount': number,
    'price': number,
    'oneTokenTotalAmount': number,
    'scarceTokenTotalAmount': number,
    'type': 'deposit' | 'withdrawal'
}

type DistilledTransaction = {
    amount: number,
    when: Date
}

type DecimalsObject = {
    baseToken: number,
    scarceToken: number
}
  
export class Vault {
    vaultName: string
    vaultEndpoint: string
    vaultAddress: string
    amountsInverted: boolean
    decimals: DecimalsObject
    dataPackets: DataPacket[]
    verboseTransactions: VerboseTransaction[] = []
    distilledTransactions: DistilledTransaction[] = []
    currentVaultValue: number
    APR: number
    IRR: number

    constructor(vaultName: string, vaultAddress: string, vaultEndpoint: string, data: DataPacket[], isInverted: boolean) {
        this.vaultName = vaultName
        this.vaultEndpoint = vaultEndpoint
        this.vaultAddress = vaultAddress
        this.amountsInverted = isInverted
        this.decimals = VAULT_DECIMAL_TRACKER[vaultName] 
        this.dataPackets = data
        this.verboseTransactions = getVerboseTransactions(this.dataPackets, this.amountsInverted, this.decimals.baseToken, this.decimals.scarceToken)
        this.distilledTransactions = getDistilledTransactions(this.verboseTransactions)
        this.calcCurrentValue()
    }

    public async calcCurrentValue() {
      let value = await getCurrentVaultValue(
        this.vaultAddress, 
        this.amountsInverted, 
        this.decimals.baseToken, 
        this.decimals.scarceToken);

      //console.log(value)  
        this.currentVaultValue = value;
    }
    
    public async getAPR() {
        let deposits = 0;
        let withdrawals = 0
        const transactions = this.distilledTransactions
        const currentVaultValue = this.currentVaultValue;
        const numTransactions = transactions.length
        const millisecondsToYears = 1000 * 60 * 60 * 24 * 365;
        const vaultTimeYears = ((transactions[numTransactions - 1]).when.getTime() - transactions[0].when.getTime()) / millisecondsToYears

        for (let transaction of transactions) {
            
            let amount = transaction.amount
            amount < 0 ? deposits += amount : withdrawals += amount
        }
    
        this.APR = ((withdrawals + currentVaultValue) / (-deposits) * 100 - 100) / vaultTimeYears
        // console.log(`The APR of the ${this.vaultName} vault is: ${this.APR}`)
    }
  
    public async getIRR() {
        let xirrObjArray = this.distilledTransactions
    
        // exception for GNO vault: 
        // Transactions earlier than 2022-03-10T14:25:23.000Z are removed. 
        // First big transaction amount is changed to 17916. 
        // amounts are multiplied by 100 because of GNO price.
        const firstTxDate = new Date('2022-03-10T14:25:23.000Z');
        if (this.vaultName === 'gno') {
          xirrObjArray = xirrObjArray.filter((tx) => { 
            const currTxDate = new Date(tx.when);
            return currTxDate >= firstTxDate});
          // replace first tx amount
          xirrObjArray = xirrObjArray.map((tx) => {
            const currTxDate = new Date(tx.when);
            if (currTxDate.getTime() === firstTxDate.getTime()){
              return {amount: -17916, when: tx.when};
            } else {
              return {amount: tx.amount, when: tx.when};
            }
          });
          xirrObjArray = xirrObjArray.map((i) => ({amount: i.amount*100, when: i.when}));
          xirrObjArray.push({ amount: this.currentVaultValue*100, when: new Date(Date.now()) });
          // console.log(`========xirrObjArray for ${this.vaultName} - 2=========== ${JSON.stringify(xirrObjArray)}`)
        } else {
          xirrObjArray.push({ amount: this.currentVaultValue, when: new Date(Date.now()) });
        }        

        let irr = xirr(xirrObjArray, { guess: -0.9975 })
        this.IRR = irr * 100
        // console.log(`The IRR of the ${this.vaultName} vault is: `,irr)
    }

}

function getVerboseTransactions(
    dataPackets: DataPacket[], 
    amountsInverted: boolean,
    baseTokenDecimals: number,
    scarceTokenDecimals: number): VerboseTransaction[] {

    let isDeposit: boolean;
    let verboseTransactions: VerboseTransaction[] = []
    let packetData: any[];
    for (let packet of dataPackets) {
        if (packet.type == 'deposit') {
            isDeposit = true;
            packetData = packet.data.data['deposits']
        } else {
            isDeposit = false
            packetData = packet.data.data['withdraws']
        }
        for (const transaction of packetData) {

            const date = new Date(transaction.createdAtTimestamp * 1000)
            const oneTokenAmount = 
                (amountsInverted ? 
                    BNtoNumberWithoutDecimals(transaction["amount1"], baseTokenDecimals) : 
                    BNtoNumberWithoutDecimals(transaction["amount0"], baseTokenDecimals))
            const scarceTokenAmount = 
                (amountsInverted ? 
                    BNtoNumberWithoutDecimals(transaction["amount0"], scarceTokenDecimals) : 
                    BNtoNumberWithoutDecimals(transaction["amount1"], scarceTokenDecimals))
            
            let price = getPrice(amountsInverted, BigNumber.from(transaction["sqrtPrice"]), baseTokenDecimals, scarceTokenDecimals); 
            price = isDeposit ? -price : price;
            
            const oneTokenTotalAmount = 
                (amountsInverted ? 
                    BNtoNumberWithoutDecimals(transaction["totalAmount1"], baseTokenDecimals) : 
                    BNtoNumberWithoutDecimals(transaction["totalAmount0"], baseTokenDecimals))
            const scarceTokenTotalAmount = 
                (amountsInverted ? 
                    BNtoNumberWithoutDecimals(transaction["totalAmount0"], scarceTokenDecimals) : 
                    BNtoNumberWithoutDecimals(transaction["totalAmount1"], scarceTokenDecimals))
            const type = packet.type

            let holder: VerboseTransaction = {
                'date': date,
                "oneTokenAmount": oneTokenAmount,
                "scarceTokenAmount": scarceTokenAmount,
                "price": price,
                "oneTokenTotalAmount": oneTokenTotalAmount,
                "scarceTokenTotalAmount": scarceTokenTotalAmount,
                'type':type
            }

            verboseTransactions.push(holder)
        }
        isDeposit = false
    }

    verboseTransactions.sort(compare)
    return verboseTransactions
}

function getDistilledTransactions(verboseTransactions: VerboseTransaction[]): DistilledTransaction[] {
    let distilledTransactions: DistilledTransaction[] = []
    for (const transaction of verboseTransactions) {
        let dollarAmount = getDollarAmount(transaction);
        if (transaction.type == 'deposit') {
            dollarAmount = -dollarAmount;
        }
        const holder:DistilledTransaction = {'amount':dollarAmount, 'when':transaction.date}
        distilledTransactions.push(holder)
    }
    return distilledTransactions
}

function getDollarAmount(transaction: VerboseTransaction): number {
    const oneTokenAmount = transaction.oneTokenAmount
    const scarceTokenAmount = transaction.scarceTokenAmount
    const price = transaction.price

    return (oneTokenAmount+price*scarceTokenAmount)
}

function compare(a,b){
    if(a['date'] > b['date']){
        return 1;
    } else if (b['date'] > a['date']){
        return -1;
    } else {
        return 0;
    }
}

export async function getCurrentVaultValue(vaultAddress: string, amountsInverted: boolean, baseTokenDecimals:number, scarceTokenDecimals:number): Promise<number>{
    
    //get Current Balance
    const infuraId = process.env.INFURA_ID;
    const RPC_HOST = `https://mainnet.infura.io/v3/${infuraId}`;
    const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);
    const vaultContract = new ethers.Contract(vaultAddress, vaultABI, provider)
    const totalAmountArray = await vaultContract.getTotalAmounts()

    const unformattedTotalBaseTokenAmount = amountsInverted ? totalAmountArray[1] : totalAmountArray[0]
    const unformattedTotalScarceTokenAmount = amountsInverted? totalAmountArray[0] : totalAmountArray[1]
    const totalBaseTokenAmount = BNtoNumberWithoutDecimals(unformattedTotalBaseTokenAmount.toString(), baseTokenDecimals)
    const totalScarceTokenAmount = BNtoNumberWithoutDecimals(unformattedTotalScarceTokenAmount.toString(), scarceTokenDecimals)

    //get Current Price
    const poolAddress: string = await vaultContract.pool()
    const poolContract = new ethers.Contract(poolAddress, poolABI, provider)
    const slot0 = await poolContract.slot0()
    
    const sqrtPrice = slot0[0]
    const price = getPrice(amountsInverted, sqrtPrice, baseTokenDecimals, scarceTokenDecimals)
    
    let currentVaultValue = totalBaseTokenAmount + price * totalScarceTokenAmount
    return currentVaultValue
}
