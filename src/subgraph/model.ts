import { GraphQLError } from "graphql";
import * as pkg from '@apollo/client';

export type GraphData = {
    data: any;
    errors?: readonly GraphQLError[];
    error?: pkg.ApolloError;
    loading: boolean;
    networkStatus: pkg.NetworkStatus;
    partial?: boolean;
}

//ICHIVaultFactory
type IchiVault = {
    id: string // the address of the ichi vault
    sender: string // the address of the signer of the transaction, usually the gnosis vault
    tokenA: string // the address of the token contract that is token0 in the vault
    allowTokenA: Boolean // determines if the liquidity provision is one-side or two-sided.
    tokenB: string // the address of the token contract tat is token1 in the vault
    allowTokenB: Boolean // determines if the liquidity provision is one-side or two-sided.
    count: number // the number of vaults that have been created to date
    fee: number // the fee as a percentage of the uniswap swap fees to be distributed to feeRecipient and affiliate accounts
    createdAtTimestamp: number // the timestamp at which the vault was created
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////// Vault
type VaultAffiliate = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the address of the vault in which the affiliate was set
    sender: string // the address of the signer of the transaction
    affiliate: string // the address of the new affiliate that will receive a split of the trading fees
}

type VaultApproval = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the address of the vault in which the approval occurred
    owner: string // the address of the owner of the spender account
    spender: string // the address for which the allowance is being set
    value: number // the new allowance
}

type DeployICHIVault = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the address of the vault that was deployed
    sender: string // the address of the signer, usually the ICHIVaultFactory
    pool: string // the address of the UniswapV3 pool that contains the assets in the vault
    allowToken0: Boolean // determines if the liquidity provision is one-side or two-sided.
    allowToken1: Boolean // determines if the liquidity provision is one-side or two-sided.
    owner: string // the owner of the ichi vault
    twapPeriod: number // the average time period
}

type VaultDeposit = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the address of the pool in which the deposit occurred
    sender: string // the signer of the deposit transaction
    to: string // the address to which liquidity pool tokens are minted
    shares: number // the quantity of liquidity tokens minted as a result of deposit
    amount0: number // the amount of token0 to be deposited
    amount1: number // the amount of token1 to be deposited
    createdAtTimestamp: number // the timestamp at which the deposit occurred
    sqrtPrice: number // The sqrtPrice at that moment in the pool that corresponds to the vault
    totalAmount0: number // the total amount of token0 in the vault after the event has occurred
    totalAmount1: number // the total amount of token1 in the vault after the event has occurred
    totalAmount0BeforeEvent: number // the total amount of token0 in the vault before the event has occurred
    totalAmount1BeforeEvent: number // the total amount of token1 in the vault before the event has occurred
}

type VaultDepositMax = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the address of the pool in which the DepositMax was set
    sender: string // the address of the signer of the transaction that set the depoist max
    deposit0Max: number // the depositMax amount of token0
    deposit1Max: number // the depositMax amount of token1
}

type VaultHysteresis = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the address of the pool in which the hysteresis was set
    sender: string // the address of the signer of the transaction
    hysteresis: number // the new hysteresis threshold in percentage
}

type MaxTotalSupply = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the address of the vault in which the MaxTotalSupply was set
    sender: string // the address of signer of the transaction
    maxTotalSupply: number // the amount that is set as the maxTotalSupply
}

type VaultOwnershipTransferred = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the address of the vault in which the ownership has been transferred
    previousOwner: string // the address of the previous owner
    newOwner: string // the address of the new owner
}

type VaultRebalance = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the vault in which the rebalance has occurred
    tick: number // the current price tick
    totalAmount0: number // the total amount of token0 in the vault
    totalAmount1: number // the total amount of token1 in the vault
    feeAmount0: number // the fees for token0
    feeAmount1: number // the fees for token1
    totalSupply: number // the total supply of the liquidity pool token that is used by the vault
}

type VaultSetTwapPeriod = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the vault in which the twap period has been set
    sender: string // the address that was the signer of the transaction
    newTwapPeriod: number // the new twap period of the vault
}

type VaultTransfer = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the address of the vault in which the transfer has occurred
    from: string // the address that is the sender of the token
    to: string // the address that is the recipient of the transfer
    value: number // the amount of the token that is transferred.
}

type VaultWithdraw = {
    id: string // the transaction hash and the log index separated by a hyphen
    vault: string // the address of the vault in which the transfer has occurred
    sender: string // the signer of the transaction in which the withdraw occurred
    to: string // the address to which the liquidity tokens are minted
    shares: number // the quantity of liquidity tokens minted as a result of a withdraw
    amount0: number // the amount of token0 that is being withdrawn
    amount1: number // the amount of token1 that is being withdrawn
    createdAtTimestamp: number // the timestamp at which the withdraw occurred
    sqrtPrice: number // the sqrt price of the pool that the vault is deployed in at the time of the event
    totalAmount0: number // the total amount of token0 in the vault after the event
    totalAmount1: number // the total amount of token1 in the vault after the event
    totalAmount0BeforeEvent: number // the total amount of token0 in the vault after the event
    totalAmount1BeforeEvent: number // the total amount of token1 in the vault after the event
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////// Farm
type FarmAccount = { // every user of the farm will have a separate accounts for each of the different farms that they use
    id: string // the address of the user and the pool id separated by a hyphen
    pid: number // the pool id of the farm
    user: FarmUser // the user to which this account belongs
    accountLPBalance: number // the amount of LP token staked in this pool of the farm by this user
}

type FarmUser = {
    id: string // the address of the user that has interacted with the farm
    accounts: FarmAccount[]// an array of accounts that represent current or previous postiions inside of the farm
}

type FarmDeposit = {
    id: string // the transaction hash and the log index separated by a hyphen
    user: string // the user that submitted the deposit
    pid: number // the pid in which this deposit occurred
    amount: number // the amount that was deposited
    to: string // the address that receives the deposit benefit
    timeStamp: number // the timestamp at which the event occurred
}

type FarmEmergencyWithdraw = {
    id: string // the transaction hash and the log index separated by a hyphen
    user: string // the user that signed the transaction
    pid: number // the pid of the farm in which the event occurred
    amount: number // the amount that was emergency withdrawn
    to: string // the address to which the withdrawn tokens
    timeStamp: number // the timestamp at which the event occurred
}

type Farm = {
    id: string // the pid of the farm
    lpToken: string // the address of the lp token of the farm
    rewardTokensPerBlock: number // the reward tokens per block of the farm
    totalAllocPoints: number // the total alloc points of the farm
    farmLPSupply: number // the total number of LP tokens staked in the farm
    totalLPSupply: number // the total supply of LP tokens in existence
    accIchiPerShare: number // the accumulated ichi per share of the farm
    lastRewardBlock: number // the last reward block of the farm
    allocPoint: number // the alloc point of the farm
    poolIchiReward: number // the pool Ichi reward of the farm
    ichiPerBlock: number // the ichi per block of the farm
    lpTokenSymbol: String // the symbol of the lp token in the farm
    lpTokenDecimals: number // the decimals of the lp token in the farm
}

type FarmHarvest = {
    id: string // the transaction hash and the log index separated by a hyphen
    user: string // the user that signed the event transaction
    pid: number // the pid of the farm in which the event occurred
    amount: number // the amount of the harvest
    timeStamp: number // the timestamp in which the event occurred
}

type FarmWithdraw = {
    id: string // the transaction hash and the log index separated by a hyphen
    user: string // the address of the user that signed the event transaction
    pid: number // the pid of the farm in which the withdraw occurred
    amount: number // the amount of the lp token that is withdrawn
    to: string // the address that is to receive the withdrawn token
    timeStamp: number // the timestamp at which the withdraw event occurred
}

type FarmLogPoolAddition = {
    id: string // the transaction hash and the log index separated by a hyphen
    pid: number // the pid of the farm in which the event occured
    allocPoint: number // the alloc point of the pool that has been added
    lpToken: string // the address of the lp token
}

type FarmLogSetPool = {
    id: string // the transaction hash and the log index separated by a hyphen
    pid: number // the pid of the farm in which the event occurred
    allocPoint: number // the alloc point of the pool that has been changed
}

type FarmLogUpdatePool = {
    id: string // the transaction hash and the log index separated by a hyphen
    pid: number // the pid of the farm in which the event occurred
    lastRewardBlock: number // the last reward block
    lpSupply: number // the supply of LP tokens in the farm
    accIchiPerShare: number //  the accIchiPerShare of the farm
}

type FarmOwnershipTransferred = {
    id: string // the transaction hash and the log index separated by a hyphen
    previousOwner: string // the address of the previous owner of the farm
    newOwner: string // the address of the new owner of the farm
}

type FarmSetIchiPerBlock = {
    id: string // the transaction hash and the log index separated by a hyphen
    ichiPerBlock: number // the amount of the ichiPerBlock
    withUpdate: Boolean // true if massUpdatePools should be triggered as well
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////// OneTokenFactory

type OneTokenFactoryAddOracle = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the signer of the transaction in which this event occurred
    foreignToken: string // a foreign token can be a collateral token, member token or other, e.g. LP token
    oracle: string // the address of the usd oracle
}

type OneTokenFactoryForeignTokenAdmitted = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address that signs the transaction
    foreignToken: string // the address of the foreign token to be added to the inventory
    isCollateral: Boolean // collateral set true if the asset is considered a collateral token
    oracle: string // the address of the usd oracle
}

type OneTokenFactoryForeignTokenRemoved = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which this event occurred
    foreignToken: string // the address of the foreign token that is to be removed from the registry
}

type OneTokenFactoryForeignTokenUpdated = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the signer of the transaction in which the event occurred
    foreignToken: string // the address of the foreign token that will have its metadata updated
    isCollateral: Boolean // collateral set true if the asset is considered a collateral token
}

type OneTokenFactoryModuleAdmitted = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the signer of the transaction in which this event occurred
    module: string // the address of the module to be admitted
    moduleType: number // the type number of the module type
    name: String // descriptive module information
    url: String // optionally point to human-readable operational description
}

type OneTokenFactoryModuleRemoved = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string  // the signer of the transaction in which this event occurred
    module: string // the address of the module to be admitted
}

type OneTokenFactoryModuleUpdated = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the signer of the transaction in which this event occurred
    module: string // the address of the module to be admitted
    name: String // descriptive module information
    url: String // optionally point to human-readable operational description
}

type OneTokenFactoryOneTokenAdmin = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the signer of the transaction in which this event occurred
    newOneTokenProxy: string // the address of the one token proxy
    proxyAdmin: string // the address of the proxyAdmin
}

type OneTokenFactoryOneTokenDeployed = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the signer of the transaction in which this event occurred
    newOneTokenProxy: string // the address of the one token proxy
    name: String // ERC20 token name
    symbol: String // ERC20 token symbol
    governance: string // address that will control admin functions in the oneToken instance
    version: string // address of a oneToken deployed implementation that emits the expected fingerprint
    controller: string // deployed controller must be registered
    mintMaster: string // deployed mintMaster must be registered
    oneTokenOracle: string // deployed oracle must be registered and will be used to check the oneToken peg
    memberToken: string // deployed ERC20 contract must be registered with at least one associated oracle
    collateral: string // deployed ERC20 contract must be registered with at least one associated oracle
}

type OneTokenFactoryOwnershipTransferred = {
    id: string // the transaction hash and the log index separated by a hyphen
    previousOwner: string // the address of the previous owner
    newOwner: string // the address of the new owner
}

type OneTokenFactoryRemoveOracle = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    foreignToken: string // the address of the foreign token
    oracle: string // the address of the usd oracle
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////// oneToken

type OneTokenAdminChanged = {
    id: string // the transaction hash and the log index separated by a hyphen
    previousAdmin: string // the address of the previous admin
    newAdmin: string // the address of the new admin
}

type OneTokenUpgraded = {
    id: string // the transaction hash and the log index separated by a hyphen
    implementation: string // the address of the new implementation
}

type OneTokenApproval = {
    id: string // the transaction hash and the log index separated by a hyphen
    owner: string // the owner that is approving the allowance
    spender: string // the spender whose allowance has been approved
    value: number // the new allowance
}

type OneTokenAssetAdded = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    token: string // the address of the token
    oracle: string // the address of the oracle
}

type OneTokenAssetRemoved = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    token: string // the address of the token
}

type OneTokenControllerChanged = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    controller: string // the address of the controller
}

type OneTokenFromStrategy = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    strategy: string // the address of the strategy
    token: string // the address of the token
    amount: number // the amount
}

type OneTokenInitialized = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    name: String // the name of the token to be initialized
    symbol: String // the symbol of the token to be initialized
    controller: string // the address of the controller
    mintMaster: string // the address of the mintMaster
    memberToken: string // the address of the memberToken
    collateral: string // the address of the collateral
}

type OneTokenMintMasterChanged = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    mintMaster: string // the address of the mint master
    oneTokenOracle: string // the address of the oneTokenOracle
}

type OneTokenMinted = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    collateral: string // the addres of the collateral
    oneTokens: number // the address of the oneTokens
    memberTokens: number // the amount of the memberTokens
    collateralTokens: number // the amount of the collateralTokens
}

type OneTokenNewFactory = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    factory: string // the address of the new one token factory
}

type OneTokenNewMintingFee = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    fee: number // the new minting fee amount
}

type OneTokenNewRedemptionFee = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event transferred
    fee: number // the new redemptive minting fee amount
}

type OneTokenOwnershipTransferred = {
    id: string // the transaction hash and the log index separated by a hyphen
    previousOwner: string // the address of the previousOwner
    newOwner: string // the address of the newOwner
}

type OneTokenRedeemed = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event occurred
    collateral: string // the address of the collateral that is utilzied in the redemption
    amount: number // the amount of the redeemed oneToken
}

type OneTokenStrategyAllowanceDecreased = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event occurred
    token: string // the address of the token
    strategy: string // the address of the strategy
    amount: number // the amount of the token
}

type OneTokenStrategyAllowanceIncreased = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string  // the address of the signer of the transaction in which the event occurred
    token: string // the address of the token
    strategy: string // the address of the strategy
    amount: number // the amount of the token
}

type OneTokenStrategyClosed = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event occurred
    token: string // the address of the token
    strategy: string // the address of the strategy
}

type OneTokenStrategyExecuted = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event occurred
    token: string // the address of the token
    strategy: string // the address of the strategy
}

type OneTokenStrategyRemoved = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event occurred
    token: string // the address of the token
    strategy: string // the address of the strategy
}

type OneTokenStrategySet = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event occurred
    token: string // the address of the token
    strategy: string // the address of the strategy
    allowance: number // the amount of the allowance
}

type OneTokenToStrategy = {
    id: string // the transaction hash and the log index separated by a hyphen
    sender: string // the address of the signer of the transaction in which the event occurred
    strategy: string // the address of the strategy
    token: string // the address of the token
    amount: number // the amount to be transferred
}

type OneTokenTransfer = {
    id: string // the transaction hash and the log index separated by a hyphen
    from: string // the address from which the transferred tokens are sent
    to: string // the address that receives the tokens that are transferred
    value: number // the value that is to be transferred
}

type IchiRariAccrueInterest = {
    id: string
    cashPrior: number // uint256
    interestAccumulated: number // uint256
    borrowIndex: number // uint256
    totalBorrows: number // uint256
}

type IchiRariApproval = {
    id: string
    owner: string // address
    spender: string // address
    amount: number // uint256
}

type IchiRariBorrow = {
    id: string
    borrower: string // address
    borrowAmount: number // uint256
    accountBorrows: number // uint256
    totalBorrows: number // uint256
}

type IchiRariFailure = {
    id: string
    error: number // uint256
    info: number // uint256
    detail: number // uint256
}

type IchiRariLiquidateBorrow = {
    id: string
    liquidator: string // address
    borrower: string // address
    repayAmount: number // uint256
    cTokenCollateral: string // address
    seizeTokens: number // uint256
}

type IchiRariMint = {
    id: string
    minter: string // address
    mintAmount: number // uint256
    mintTokens: number // uint256
}

type IchiRariNewAdminFee = {
    id: string
    oldAdminFeeMantissa: number // uint256
    newAdminFeeMantissa: number // uint256
}

type IchiRariNewComptroller = {
    id: string
    oldComptroller: string // address
    newComptroller: string // address
}

type IchiRariNewFuseFee = {
    id: string
    oldFuseFeeMantissa: number // uint256
    newFuseFeeMantissa: number // uint256
}

type IchiRariNewImplementation = {
    id: string
    oldImplementation: string // address
    newImplementation: string // address
}

type IchiRariNewMarketInterestRateModel = {
    id: string
    oldInterestRateModel: string // address
    newInterestRateModel: string // address
}

type IchiRariNewReserveFactor = {
    id: string
    oldReserveFactorMantissa: number // uint256
    newReserveFactorMantissa: number // uint256
}

type IchiRariRedeem = {
    id: string
    redeemer: string // address
    redeemAmount: number // uint256
    redeemTokens: number // uint256
}

type IchiRariRepayBorrow = {
    id: string
    payer: string // address
    borrower: string // address
    repayAmount: number // uint256
    accountBorrows: number // uint256
    totalBorrows: number // uint256
}

type IchiRariReservesAdded = {
    id: string
    benefactor: string // address
    addAmount: number // uint256
    newTotalReserves: number // uint256
}

type IchiRariReservesReduced = {
    id: string
    admin: string // address
    reduceAmount: number // uint256
    newTotalReserves: number // uint256
}

type IchiRariTransfer = {
    id: string
    from: string // address
    to: string // address
    amount: number // uint256
}

type IchiRariSupplyThresholdReached = {
    id: string
    currentRatio: String
    supplyIchi: String
    supplyCap: String
    timeStamp: number
}

type xICHIApproval = {
    id: string
    owner: string // address
    spender: string // address
    value: number // uint256
}

type xICHITransfer = {
    id: string
    from: string // address
    to: string // address
    value: number // uint256
    ichiAmount: number
    xICHIAmount: number
    delta: number
    timeStamp: number
}

