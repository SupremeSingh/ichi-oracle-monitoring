import { ADDRESSES, POOLS, LABELS, CHAIN_ID, TOKENS } from './configMainnet';
import univ3prices from '@thanpolas/univ3prices';
import * as pkg from '@apollo/client';
import 'cross-fetch/dist/node-polyfill.js';
const { ApolloClient, InMemoryCache, gql } = pkg;
import * as ethers from 'ethers'
import { BigNumber } from 'ethers';
import vaultABI from './abis/ICHI_VAULT_ABI.json';
import poolABI from './abis/UNI_V3_POOL_ABI.json'
import xirr from 'xirr'

async function subgraph_query(endpoint: string, page: number, tokensQuery) {
    var client = new ApolloClient({
        uri: endpoint,
        cache: new InMemoryCache(),
    })
    return await client
        .query({
        query: gql(tokensQuery),
        variables: {
            first: 10,
            skip: (page-1)*10,
        },
    })
}

type dataPacket = {
    data: pkg.ApolloQueryResult<any>,
    type: 'deposit' | 'withdrawal'
}

let decimalTracker={
  "ichi": {oneToken:18, scarceToken:9},
  "fuse": {oneToken:18, scarceToken:18},
  "wing": {oneToken:18, scarceToken:9},
  "fox": {oneToken:18, scarceToken:18}
}

class Vault {
    vaultName: string
    vaultEndpoint: string
    vaultAddress: string
    amountsInverted: boolean
    decimals: decimalsObject
    dataPackets: dataPacket[]
    verboseTransactions: verboseTransactionObject[] = []
    distilledTransactions: distilledTransactionObject[] = []
    currentVaultValue: number
    APR: number
    IRR: number

    constructor(vaultName: string, vaultAddress: string, vaultEndpoint: string, data: dataPacket[], isInverted: boolean) {
        this.vaultName = vaultName
        this.vaultEndpoint = vaultEndpoint
        this.vaultAddress = vaultAddress
        this.amountsInverted = isInverted
        this.decimals = decimalTracker[vaultName] 
        this.dataPackets = data
        this.verboseTransactions = getVerboseTransactions(this.vaultName, 
        this.dataPackets, this.amountsInverted, this.decimals.scarceToken)
        this.distilledTransactions = getDistilledTransactions(this.verboseTransactions)
        this.calcCurrentValue()
    }

    public async calcCurrentValue() {
      let value = await getCurrentVaultValue(
        this.vaultName, 
        this.vaultAddress, 
        this.amountsInverted, 
        this.decimals.oneToken, 
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
        xirrObjArray.push({amount:this.currentVaultValue, when: new Date(Date.now())})
        let irr = xirr(xirrObjArray, { guess: -0.9975 })
        this.IRR = irr
        // console.log(`The IRR of the ${this.vaultName} vault is: `,irr)
    }

}

type verboseTransactionObject = {
  'date': Date,
  'oneTokenAmount': number,
  'scarceTokenAmount': number,
  'price': number,
  'oneTokenTotalAmount': number,
  'scarceTokenTotalAmount': number,
  'type': 'deposit' | 'withdrawal'
}

type distilledTransactionObject = {
  amount: number,
  when: Date
}

type decimalsObject = {
  oneToken: number,
  scarceToken: number
}

  
function getVerboseTransactions(
    name: string, 
    dataPackets: dataPacket[], 
    amountsInverted: boolean,
    decimals: number): verboseTransactionObject[] {

    let transactionsType: string;
    let isDeposit: boolean;
    let verboseTransactions: verboseTransactionObject[] = []
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
                (amountsInverted ? BNtoNumberWithoutDecimals(transaction["amount1"], 18) : BNtoNumberWithoutDecimals(transaction["amount0"], 18))
            const scarceTokenAmount = 
                (amountsInverted ? BNtoNumberWithoutDecimals(transaction["amount0"], decimals) : BNtoNumberWithoutDecimals(transaction["amount1"], decimals))
            
            const price = isDeposit ? -1*parseFloat(getPrice(name, amountsInverted, BigNumber.from(transaction["sqrtPrice"]), decimals)) :
                parseFloat(getPrice(name, amountsInverted, BigNumber.from(transaction["sqrtPrice"]), decimals))
            
            const oneTokenTotalAmount = 
                (amountsInverted ? BNtoNumberWithoutDecimals(transaction["totalAmount1"], 18) : BNtoNumberWithoutDecimals(transaction["totalAmount0"], 18))
            const scarceTokenTotalAmount = 
                (amountsInverted ? BNtoNumberWithoutDecimals(transaction["totalAmount0"], decimals) : BNtoNumberWithoutDecimals(transaction["totalAmount1"], decimals))
            const type = packet.type

            let holder: verboseTransactionObject = {
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

function getDistilledTransactions(verboseTransactions: verboseTransactionObject[]): distilledTransactionObject[] {
    let distilledTransactions: distilledTransactionObject[] = []
    for (const transaction of verboseTransactions) {
        let dollarAmount = getDollarAmount(transaction);
        if (transaction.type == 'deposit') {
            dollarAmount = -dollarAmount;
        }
        const holder:distilledTransactionObject = {'amount':dollarAmount, 'when':transaction.date}
        distilledTransactions.push(holder)
    }
    return distilledTransactions
}

function getPrice(name: string, isInverted: boolean, sqrtPrice: BigNumber, decimals: number) {
    let decimalArray = [18,decimals]
    let price = univ3prices(decimalArray, sqrtPrice).toSignificant({
        reverse: isInverted,
        decimalPlaces: 3
    });

    return price;
}
 
function getDollarAmount(transaction: verboseTransactionObject): number {
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

function BNtoNumberWithoutDecimals(val: string, decimals: number): number {
    if (val != null) {
        const digits = val.length
        let tempVal = ''
        if (digits <= decimals) {
            tempVal = '0.'
            for (let i = 0; i < decimals - digits; i++) {
                tempVal = `${tempVal}0`
            }
            tempVal = `${tempVal}${val}`
        } else {
            for (let i = 0; i < digits - decimals; i++) {
                tempVal = `${tempVal}${val[i]}`
            }
            tempVal = `${tempVal}.`
            for (let i = digits - decimals; i < digits; i++) {
                tempVal = `${tempVal}${val[i]}`
            }
        }
        return Number(tempVal)
    }
    return 0
}

async function getCurrentVaultValue(vaultName:string, vaultAddress: string, amountsInverted: boolean, oneTokenDecimals:number, scarceTokenDecimals:number): Promise<number>{
    
    //get Current Balance
    const infuraId = process.env.INFURA_ID;
    const RPC_HOST = `https://mainnet.infura.io/v3/${infuraId}`;
    const provider = new ethers.providers.JsonRpcProvider(RPC_HOST);
    //console.log(vaultAddress)
    const vaultContract = new ethers.Contract(vaultAddress, vaultABI, provider)
    const totalAmountArray = await vaultContract.getTotalAmounts()

    const unformattedTotalOneTokenAmount = amountsInverted ? totalAmountArray[1] : totalAmountArray[0]
    const unformattedTotalScarceTokenAmount = amountsInverted? totalAmountArray[0] : totalAmountArray[1]
    const totalOneTokenAmount = parseInt(ethers.utils.formatUnits(unformattedTotalOneTokenAmount,oneTokenDecimals)) 
    const totalScarceTokenAmount = parseInt(ethers.utils.formatUnits(unformattedTotalScarceTokenAmount, scarceTokenDecimals))

    //get Current Price
    const poolAddress: string = await vaultContract.pool()
    const poolContract = new ethers.Contract(poolAddress, poolABI, provider)
    const slot0 = await poolContract.slot0()
    
    const sqrtPrice = slot0[0]
    //console.log(sqrtPrice.toString())
    const price = getPrice(vaultName, amountsInverted, sqrtPrice, scarceTokenDecimals)
    
    let currentVaultValue = totalOneTokenAmount + price * totalScarceTokenAmount
    return currentVaultValue
}

export {subgraph_query, Vault, dataPacket, getVerboseTransactions, getDistilledTransactions}

