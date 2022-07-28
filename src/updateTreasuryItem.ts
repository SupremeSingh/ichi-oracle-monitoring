import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ethers } from 'ethers';
import { dbClient } from './configMainnet';
import { getPoolRecord } from './getPoolRecord';
import { GraphData } from './subgraph/model';
import { risk_harbor_graph_query, RiskHarborPosition } from './subgraph/risk_harbor';
import {
  Apis,
  getDebankPortfolio,
  ChainId,
  getProvider,
  TokenName,
  getToken,
  AddressName,
  getAddress,
  OneTokenV1__factory,
  OneLink__factory,
  OneEth__factory,
  MainnetPoolNumbers,
  getLegacyTreasuries,
  getOneTokenAttributes,
  DebankProtocolName,
  getIchiContract,
  asOneTokenV1,
  asOneEth,
  asOneLink,
  getFarmingV2Contract,
  getErc20Contract,
  getIchiVaultContract,
  getOneTokenV1Contract,
  getUniswapV3PositionsContract,
  getGenericFarmingV2Contract,
  get1InchStakingContract,
  getBmiStakingContract,
  getPoolLabel,
  PartialRecord,
  VaultName
} from '@ichidao/ichi-sdk';
import { getAllyContract } from '@ichidao/ichi-sdk/dist/src/utils/contracts';
import { VAULTS } from '@ichidao/ichi-sdk/dist/src/constants/vaults';
import { TOKENS } from '@ichidao/ichi-sdk/dist/src/constants/tokens';

// const BSC_RPC_HOST = BSC_APIS.rpcHost;

// TODO: Type this and figure out a better mechanism
const getOneTokenContract = function (tokenName: TokenName) {
  switch (tokenName) {
    case TokenName.ONE_VBTC:
    case TokenName.ONE_ETH:
      return OneEth__factory;
    case TokenName.ONE_LINK:
      return OneLink__factory;
    case TokenName.ONE_BTC:
    case TokenName.ONE_WING:
      return OneTokenV1__factory;
    default:
      return OneTokenV1__factory;
  }
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateTreasuryItem = async (
  tableName: string,
  tokenName: TokenName,
  tokenPrices: PartialRecord<TokenName, number>,
  tokenNames: PartialRecord<TokenName, string>,
  chainId: ChainId
): Promise<APIGatewayProxyResult> => {
  const provider = await getProvider(chainId);
  const farming_V2 = getFarmingV2Contract(getAddress(AddressName.FARMING_V2, chainId), provider);
  const uniswap_V3_positions = getUniswapV3PositionsContract(
    getAddress(AddressName.UNISWAP_V3_POSITIONS, chainId),
    provider
  );

  const attr = getOneTokenAttributes(tokenName, chainId);
  const oneTokenAddress = attr.address;
  const strategyAddress = attr.strategy;
  const auxStrategies = attr.aux_strategy;
  const allySwapAddress = attr.ally_swap;
  const stimulusTokenAddress = attr.stimulus_address;
  const stimulusDisplayName = attr.stimulus_display_name;
  const stimulusTokenName = attr.stimulus_name;
  const stimulusDecimals = attr.stimulus_decimals;
  const collateralToken = attr.collateralToken;
  const baseName = attr.base_name;
  const decimals = attr.decimals;
  const tradeUrl = attr.tradeUrl;
  const isV2 = attr.isV2;
  const displayName = getToken(tokenName, chainId).displayName;

  const isLegacy = getLegacyTreasuries(chainId).includes(tokenName);

  const ichi = getIchiContract(getToken(TokenName.ICHI, chainId).address, provider);
  const stimulusToken = getErc20Contract(stimulusTokenAddress, provider);
  const usdc = getErc20Contract(getToken(TokenName.USDC, chainId).address, provider);
  const dai = getErc20Contract(getToken(TokenName.DAI, chainId).address, provider);
  const ally = getAllyContract(getAddress(AddressName.ALLY, chainId), provider);
  const oneTokenContract = getOneTokenContract(oneTokenAddress as TokenName);
  const oneToken = oneTokenContract.connect(oneTokenAddress, provider);
  const oneUNI = getOneTokenV1Contract(getToken(TokenName.ONE_UNI, chainId).address, provider);
  const oneBTC = getOneTokenV1Contract(getToken(TokenName.ONE_BTC, chainId).address, provider);
  const bmiStaking = getBmiStakingContract(getAddress(AddressName.BMI_STAKING, chainId), provider);
  const _1InchStaking = get1InchStakingContract(getAddress(AddressName._1INCH_STAKING, chainId), provider);
  const st1INCH = getErc20Contract(getAddress(AddressName.ST1INCH, chainId), provider);
  const _1Inch = getOneTokenV1Contract(getToken(TokenName['1INCH'], chainId).address, provider);
  // const riskHarbor = new ethers.Contract(ADDRESSES.risk_harbor, RISKHARBOR_ABI, provider);

  const oneTokenUsdc = Number(await usdc.balanceOf(oneTokenAddress));
  const oneTokenDai = Number(await dai.balanceOf(oneTokenAddress));
  const oneTokenStimulus = Number(await stimulusToken.balanceOf(oneTokenAddress));
  const oneTokenIchi = Number(await ichi.balanceOf(oneTokenAddress));

  // =================================================================================
  // get balances from the strategy, if it exists

  let strategy_balance_usdc = 0;
  let strategy_balance_usdc_treasury = 0;
  let strategy_balance_dai = 0;
  let strategy_balance_dai_treasury = 0;
  let strategy_balance_stimulus = 0;
  let strategy_balance_onetoken = 0;
  let strategy_balance_ally = 0;
  let strategy_balance_one_btc = 0;
  let strategy_balance_one_uni = 0;
  let strategy_balance_one_oja = 0;
  let strategy_balance_oja = 0;
  let strategy_balance_ichi = 0;
  let strategy_balance_one_ichi = 0;
  let strategy_balance_wbtc = 0;
  let strategy_balance_bmi_usdt = 0;
  let strategy_balance_st1inch = 0;
  let strategy_balance_1inch = 0;
  let uni_v3_positions = 0;
  let aux_strategy_balance_riskharbor_usdc = 0;
  let aux_strategy_balance_usdc = 0;

  if (strategyAddress !== '') {
    strategy_balance_usdc += Number(await usdc.balanceOf(strategyAddress));
    strategy_balance_dai += Number(await dai.balanceOf(strategyAddress));

    strategy_balance_stimulus += Number(await stimulusToken.balanceOf(strategyAddress));
    strategy_balance_onetoken += Number(await oneToken.balanceOf(strategyAddress));
    // TODO: Logic change, review.
    // if (tokenName !== 'oneUNI') {
    if (tokenName.toLowerCase() !== TokenName.ONE_UNI.toLowerCase()) {
      strategy_balance_one_uni += Number(await oneUNI.balanceOf(strategyAddress));
    }
    // TODO: Logic change, review.
    // if (tokenName !== 'oneBTC') {
    if (tokenName.toLowerCase() !== TokenName.ONE_BTC.toLowerCase()) {
      strategy_balance_one_btc += Number(await oneBTC.balanceOf(strategyAddress));
    }
    strategy_balance_ichi += Number(await ichi.balanceOf(strategyAddress));

    let strategy_balance_vault_lp = 0;
    if (attr.ichiVault.farm > 0 && attr.ichiVault.externalFarm === '') {
      const userInfo = await farming_V2.userInfo(attr.ichiVault.farm, strategyAddress);
      strategy_balance_vault_lp += Number(userInfo.amount);
    }
    if (attr.ichiVault.externalFarm !== '' && attr.ichiVault.externalFarm.length > 0) {
      const generic_farming_V2 = getGenericFarmingV2Contract(attr.ichiVault.externalFarm, provider);
      const userInfo = await generic_farming_V2.userInfo(attr.ichiVault.farm, strategyAddress);
      strategy_balance_vault_lp += Number(userInfo.amount);
    }
    if (attr.ichiVault.address !== '') {
      const vault = getIchiVaultContract(attr.ichiVault.address, provider);
      strategy_balance_vault_lp += Number(await vault.balanceOf(strategyAddress));
      const vault_total_lp = Number(await vault.totalSupply());
      const vault_total_amounts = await vault.getTotalAmounts();
      if (strategy_balance_vault_lp > 0) {
        const vault_ratio = strategy_balance_vault_lp / vault_total_lp;
        if (attr.ichiVault.scarceToken === 'token0') {
          if (attr.ichiVault.scarceTokenName === 'ichi') {
            strategy_balance_ichi += Number(vault_total_amounts.total0) * vault_ratio;
          } else {
            strategy_balance_stimulus += Number(vault_total_amounts.total0) * vault_ratio;
          }
          strategy_balance_onetoken += Number(vault_total_amounts.total1) * vault_ratio;
        } else {
          if (attr.ichiVault.scarceTokenName === 'ichi') {
            strategy_balance_ichi += Number(vault_total_amounts.total1) * vault_ratio;
          } else {
            strategy_balance_stimulus += Number(vault_total_amounts.total1) * vault_ratio;
          }
          strategy_balance_onetoken += Number(vault_total_amounts.total0) * vault_ratio;
        }
      }
    }

    strategy_balance_bmi_usdt = Number(await bmiStaking.totalStaked(strategyAddress));
    uni_v3_positions = Number(await uniswap_V3_positions.balanceOf(strategyAddress));

    // TODO: Logic change, review.
    // if (tokenName == 'one1INCH') {
    if (tokenName.toLowerCase() == TokenName.ONE_1INCH.toLowerCase()) {
      strategy_balance_st1inch += Number(await st1INCH.balanceOf(strategyAddress));
      strategy_balance_stimulus += Number(await _1InchStaking.earned(strategyAddress));
    }
  }

  if (allySwapAddress !== '') {
    strategy_balance_onetoken += Number(await oneToken.balanceOf(allySwapAddress));
    strategy_balance_ally += Number(await ally.balanceOf(allySwapAddress));
  }

  if (auxStrategies.length > 0) {
    // there could be multiple aux strategies
    for (let i = 0; i < auxStrategies.length; i++) {
      let auxStrategyAddress = auxStrategies[i];

      // aux strategy may own USDC
      aux_strategy_balance_usdc = Number(await usdc.balanceOf(auxStrategyAddress));
      strategy_balance_usdc += aux_strategy_balance_usdc;

      // aux strategy may own Risk Harbor postions
      let rh_total_shares = 0;
      let rh_strategy_shares = 0;
      let rh_total_capacity = 0;
      let rh_total_premiums = 0;
      let rawData: boolean | GraphData = await risk_harbor_graph_query(Apis.SUBGRAPH_RISK_HARBOR, auxStrategyAddress);
      if (rawData && rawData['data']) {
        let rhData = rawData['data']['underwriterPositions'] as RiskHarborPosition[];
        for (let i = 0; i < rhData.length; i++) {
          let rh_position = rhData[i];
          rh_strategy_shares += Number(rh_position.shares);
          rh_total_shares = Number(rh_position.vault.totalSharesIssued);
          rh_total_capacity = Number(rh_position.vault.totalCapacity);
          rh_total_premiums = Number(rh_position.vault.totalPremiumsPaid);
        }
        if (rh_total_shares > 0) {
          let rh_price = (rh_total_capacity + rh_total_premiums) / rh_total_shares;
          aux_strategy_balance_riskharbor_usdc = rh_strategy_shares * rh_price;
        }
      } else {
        console.log('no risk harbor data');
      }

      // special case of oneUNI investing into OneICHI vault
      if (tokenName.toLowerCase() === TokenName.ONE_UNI.toLowerCase()) {
        const oneICHIVault = getIchiVaultContract(VAULTS[VaultName.ONEICHI_ICHI][chainId].address, provider);

        let strategy_balance_vault_lp = Number(await oneICHIVault.balanceOf(auxStrategyAddress));

        const vault_total_lp = Number(await oneICHIVault.totalSupply());
        const vault_total_amounts = await oneICHIVault.getTotalAmounts();
        if (strategy_balance_vault_lp > 0) {
          const vault_ratio = strategy_balance_vault_lp / vault_total_lp;
          strategy_balance_ichi += (Number(vault_total_amounts.total0) * vault_ratio) / 
            10 ** (TOKENS[TokenName.ICHI_V2][chainId].decimals - TOKENS[TokenName.ICHI][chainId].decimals);
          strategy_balance_one_ichi += Number(vault_total_amounts.total1) * vault_ratio;
        }
      }

      // special case of oneUNI investing into USDC vault
      if (tokenName.toLowerCase() === TokenName.ONE_UNI.toLowerCase()) {
        const USDCVault = getIchiVaultContract(VAULTS[VaultName.USDC_ICHI][chainId].address, provider);

        let strategy_balance_vault_lp = Number(await USDCVault.balanceOf(auxStrategyAddress));

        const vault_total_lp = Number(await USDCVault.totalSupply());
        const vault_total_amounts = await USDCVault.getTotalAmounts();
        if (strategy_balance_vault_lp > 0) {
          const vault_ratio = strategy_balance_vault_lp / vault_total_lp;
          strategy_balance_ichi += (Number(vault_total_amounts.total0) * vault_ratio) / 
            10 ** (TOKENS[TokenName.ICHI_V2][chainId].decimals - TOKENS[TokenName.ICHI][chainId].decimals);
          strategy_balance_usdc += Number(vault_total_amounts.total1) * vault_ratio;
        }
      }
    }
  }

  //console.log(aux_strategy_balance_usdc);
  //console.log(aux_strategy_balance_riskharbor_usdc);

  if (uni_v3_positions > 0) {
    let all_v3_positions = await getDebankPortfolio(strategyAddress, DebankProtocolName.UNI_V3);
    if (all_v3_positions && all_v3_positions.portfolio_item_list && all_v3_positions.portfolio_item_list.length > 0) {
      for (let i = 0; i < all_v3_positions.portfolio_item_list.length; i++) {
        let detail = all_v3_positions.portfolio_item_list[i].detail;
        if (detail.supply_token_list && detail.supply_token_list.length > 0) {
          let usdc_in_position = 0;
          let dai_in_position = 0;
          let isCollateral = false;
          for (let k = 0; k < detail.supply_token_list.length; k++) {
            let supply_token = detail.supply_token_list[k];
            if (supply_token.id.toLowerCase() === oneTokenAddress.toLowerCase()) {
              isCollateral = true;
              strategy_balance_onetoken += Number(supply_token.amount) * 10 ** 18;
            } else if (supply_token.id.toLowerCase() === getToken(TokenName.ONE_UNI, chainId).address.toLowerCase()) {
              // TODO: Logic change, review
              // if (tokenName !== 'oneUNI') {
              if (tokenName.toLowerCase() !== TokenName.ONE_UNI.toLowerCase()) {
                strategy_balance_one_uni += Number(supply_token.amount) * 10 ** 18;
              } else {
                strategy_balance_onetoken += Number(supply_token.amount) * 10 ** 18;
              }
            } else if (supply_token.id.toLowerCase() === getToken(TokenName.ICHI, chainId).address.toLowerCase()) {
              strategy_balance_ichi += Number(supply_token.amount) * 10 ** getToken(TokenName.ICHI, chainId).decimals;
            } else if (supply_token.id.toLowerCase() === getToken(TokenName.USDC, chainId).address.toLowerCase()) {
              usdc_in_position += Number(supply_token.amount) * 10 ** getToken(TokenName.USDC, chainId).decimals;
            } else if (supply_token.id.toLowerCase() === getToken(TokenName.DAI, chainId).address.toLowerCase()) {
              dai_in_position += Number(supply_token.amount) * 10 ** getToken(TokenName.DAI, chainId).decimals;
            } else if (supply_token.id.toLowerCase() === getToken(TokenName.ONE_BTC, chainId).address.toLowerCase()) {
              strategy_balance_one_btc +=
                Number(supply_token.amount) * 10 ** getToken(TokenName.ONE_BTC, chainId).decimals;
            } else if (supply_token.id.toLowerCase() === stimulusTokenAddress.toLowerCase()) {
              strategy_balance_stimulus += Number(supply_token.amount) * 10 ** stimulusDecimals;
            } else if (supply_token.id.toLowerCase() === getToken(TokenName.WBTC, chainId).address.toLowerCase()) {
              strategy_balance_wbtc += Number(supply_token.amount) * 10 ** getToken(TokenName.WBTC, chainId).decimals;
            }
          }
          if (isCollateral) {
            strategy_balance_usdc += usdc_in_position;
            strategy_balance_dai += dai_in_position;
          } else {
            strategy_balance_usdc_treasury += usdc_in_position;
            strategy_balance_dai_treasury += dai_in_position;
          }
        }
      }
    }
  }

  strategy_balance_usdc += strategy_balance_usdc_treasury;
  strategy_balance_dai += strategy_balance_dai_treasury;

  // in case of oneBTC combine all wBTC positions into one
  // TODO: Logic change, review
  // if (tokenName == 'oneBTC') {
  if (tokenName == TokenName.ONE_BTC) {
    strategy_balance_stimulus += strategy_balance_wbtc;
    strategy_balance_wbtc = 0;
  }

  // special case of oneUNI investing into OJA vault
  // TODO: Logic change, review
  // if (tokenName == 'oneUNI') {
  if (tokenName == TokenName.ONE_UNI) {
    const ojaContract = getErc20Contract(getToken(TokenName.OJA, chainId).address, provider);
    const oneOJA = getOneTokenV1Contract(getToken(TokenName.ONE_OJA, chainId).address, provider);
    const ojaFarm = getGenericFarmingV2Contract(getToken(TokenName.ONE_OJA, chainId).ichiVault.externalFarm, provider);
    const ojaVault = getIchiVaultContract(getToken(TokenName.ONE_OJA, chainId).ichiVault.address, provider);

    strategy_balance_one_oja += Number(await oneOJA.balanceOf(strategyAddress));
    strategy_balance_oja += Number(await ojaContract.balanceOf(strategyAddress));

    const userInfo = await ojaFarm.userInfo(getToken(TokenName.ONE_OJA, chainId).ichiVault.farm, strategyAddress);
    let strategy_balance_vault_lp_in_farm = Number(userInfo.amount);
    let strategy_balance_vault_lp = Number(await ojaVault.balanceOf(strategyAddress));
    strategy_balance_vault_lp += strategy_balance_vault_lp_in_farm;

    const vault_total_lp = Number(await ojaVault.totalSupply());
    const vault_total_amounts = await ojaVault.getTotalAmounts();
    if (strategy_balance_vault_lp > 0) {
      const vault_ratio = strategy_balance_vault_lp / vault_total_lp;
      strategy_balance_oja += Number(vault_total_amounts.total0) * vault_ratio;
      strategy_balance_one_oja += Number(vault_total_amounts.total1) * vault_ratio;
    }
  }
  // console.log(strategy_balance_one_oja);
  // console.log(strategy_balance_oja);

  // special case of oneUNI investing into oneBTC assets
  // TODO: Logic change, review
  // if (tokenName == 'oneUNI') {
  if (tokenName == TokenName.ONE_UNI) {
    const wBTC = getErc20Contract(getToken(TokenName.WBTC, chainId).address, provider);
    const oneBTC = getOneTokenV1Contract(getToken(TokenName.ONE_BTC, chainId).address, provider);
    const oneBTCVault = getIchiVaultContract(getToken(TokenName.ONE_BTC, chainId).ichiVault.address, provider);

    strategy_balance_one_btc += Number(await oneBTC.balanceOf(strategyAddress));
    strategy_balance_wbtc += Number(await wBTC.balanceOf(strategyAddress));

    let strategy_balance_vault_lp = Number(await oneBTCVault.balanceOf(strategyAddress));

    const vault_total_lp = Number(await oneBTCVault.totalSupply());
    const vault_total_amounts = await oneBTCVault.getTotalAmounts();
    if (strategy_balance_vault_lp > 0) {
      const vault_ratio = strategy_balance_vault_lp / vault_total_lp;
      strategy_balance_ichi += Number(vault_total_amounts.total0) * vault_ratio;
      strategy_balance_one_btc += Number(vault_total_amounts.total1) * vault_ratio;
    }
  }
  // console.log(strategy_balance_one_btc);
  // console.log(strategy_balance_ichi);
  // console.log(strategy_balance_wbtc);

  // special case of oneBTC investing into vaults
  // TODO: Logic change, review
  // if (tokenName == 'oneBTC') {
  if (tokenName == TokenName.ONE_BTC) {
    // const wBTCVault = getIchiVaultContract(PoolLabels[MainnetPoolNumbers.WBTC_VAULT][chainId].vaultAddress, provider);
    const wBTCVault = getIchiVaultContract(getPoolLabel(MainnetPoolNumbers.WBTC_VAULT, chainId).vaultAddress, provider);

    let strategy_balance_vault_lp = Number(await wBTCVault.balanceOf(strategyAddress));

    const vault_total_lp = Number(await wBTCVault.totalSupply());
    const vault_total_amounts = await wBTCVault.getTotalAmounts();
    if (strategy_balance_vault_lp > 0) {
      const vault_ratio = strategy_balance_vault_lp / vault_total_lp;
      strategy_balance_ichi += (Number(vault_total_amounts.total0) * vault_ratio) / 10 ** 9;
      strategy_balance_wbtc += Number(vault_total_amounts.total1) * vault_ratio;
    }
  }

  // special case of one1Inch investing into 1Inch-ICHI vault
  if (tokenName.toLowerCase() === TokenName.ONE_1INCH.toLowerCase()) {

      const oneInchVault = getIchiVaultContract(VAULTS[VaultName['1INCH']][chainId].address, provider);
    
      let strategy_balance_vault_lp = Number(await oneInchVault.balanceOf(strategyAddress));
      const vault_total_lp = Number(await oneInchVault.totalSupply());
      const vault_total_amounts = await oneInchVault.getTotalAmounts();
      
      if (strategy_balance_vault_lp > 0) {
          const vault_ratio = strategy_balance_vault_lp / vault_total_lp;
          strategy_balance_1inch += (Number(vault_total_amounts.total0) * vault_ratio); 
          strategy_balance_ichi += Number(vault_total_amounts.total1) * vault_ratio / 
            10 ** (TOKENS[TokenName.ICHI_V2][chainId].decimals - TOKENS[TokenName.ICHI][chainId].decimals);
      }
  }
  // console.log(`ICHI Balance ${strategy_balance_ichi}`);
  // console.log(`1INCH Balance ${strategy_balance_1inch}`);
  

  // TODO: Logic change, review
  // if (tokenName == 'oneDODO') {
  if (tokenName == TokenName.ONE_DODO) {
    // BCS positions for oneDODO

    const bsc_provider = new ethers.providers.JsonRpcProvider(Apis.BSC_RPC_HOST);

    const bscContractUsdc = getErc20Contract(getAddress(AddressName.USDC, ChainId.Bsc), bsc_provider);
    const bscContractOneDodo = getErc20Contract(getAddress(AddressName.ONE_DODO, ChainId.Bsc), bsc_provider);
    const bscContractDlp = getErc20Contract(getAddress(AddressName.DLP, ChainId.Bsc), bsc_provider);

    let usdc_in_gnosis = Number(await bscContractUsdc.balanceOf(getAddress(AddressName.GNOSIS, ChainId.Bsc)));
    let oneDodo_in_gnosis = Number(await bscContractOneDodo.balanceOf(getAddress(AddressName.GNOSIS, ChainId.Bsc)));
    const dlp_in_gnosis = Number(await bscContractDlp.balanceOf(getAddress(AddressName.GNOSIS, ChainId.Bsc)));

    const usdc_in_dlp = Number(await bscContractUsdc.balanceOf(getAddress(AddressName.DLP, ChainId.Bsc)));
    const oneDODO_in_dlp = Number(await bscContractOneDodo.balanceOf(getAddress(AddressName.DLP, ChainId.Bsc)));

    const dlp_total_supply = Number(await bscContractDlp.totalSupply());

    if (dlp_total_supply > 0) {
      const pct_dlp_in_gnosis = dlp_in_gnosis / dlp_total_supply;
      usdc_in_gnosis += pct_dlp_in_gnosis * usdc_in_dlp;
      oneDodo_in_gnosis += pct_dlp_in_gnosis * oneDODO_in_dlp;
    }

    usdc_in_gnosis = usdc_in_gnosis / 10 ** 12; // from 18 dec to 6 dec USDC

    strategy_balance_usdc += usdc_in_gnosis;
    strategy_balance_onetoken += oneDodo_in_gnosis;
  }

  let oneToken_stimulus_price = tokenPrices[stimulusTokenName.toLowerCase()];

  let oneTokenCollateralPostions = [];
  let oneTokenStimulusPostions = [];

  let stimulusPositionsUSDValue = 0;
  let collateralPositionsUSDValue = 0;

  let stimulusPositionsAPY = 0;
  let collateralPositionsAPY = 0;

  let oneToken_burned_tokens = 0;

  if (collateralPositionsUSDValue > 0) {
    collateralPositionsAPY = (collateralPositionsUSDValue * collateralPositionsAPY) / collateralPositionsUSDValue;
  }

  const oneToken_SUPPLY = await oneToken.totalSupply();

  // =================================================================================
  // get oneToken strategy position, if it exists

  /* if (strategy_balance_onetoken > 0) {
  
    let percentOwnership = strategy_balance_onetoken / Number(oneToken_SUPPLY);
    let usdValue = strategy_balance_onetoken / 10 ** 18;
    let yAPY = 0;

    assets = [];
    assets.push({ M: { 
      name: { S: itemName }, 
      balance: { N: (Number(strategy_balance_onetoken / 10 ** 18)).toString() } 
    }});
    let oneToken_Strategy_Position = {
      name:  { S: itemName + ' Position' },
      LP:  { N: (strategy_balance_onetoken / 10 ** 18).toString() },
      percentOwnership: { N: (percentOwnership * 100).toString() },
      usdValue: { N: usdValue.toString() },
      assets: { L: assets }
    };

    if (stimulusPositionsUSDValue + usdValue > 0) {
      stimulusPositionsAPY = (stimulusPositionsUSDValue * stimulusPositionsAPY + usdValue * yAPY) / 
        (stimulusPositionsUSDValue + usdValue);
    }
    stimulusPositionsUSDValue = stimulusPositionsUSDValue + usdValue;
    oneTokenStimulusPostions.push({ M: oneToken_Strategy_Position });

    //var jsonPretty = JSON.stringify(oneTokenStimulusPostions,null,20);    
    //console.log(jsonPretty);
  } */

  // =================================================================================
  // special oneVBTC logic in this section

  // TODO: Logic change, review
  // if (tokenName == 'oneVBTC') {
  if (tokenName == TokenName.ONE_VBTC) {
    // TODO: I think the easiest thing here to do is just create the relevant factory connect if this one so the call can succeed

    // temp fix for oneVBTC (removing price of burned stablecoins for a specific address from the total)
    oneToken_burned_tokens = Number(
      await asOneEth(oneToken).getBurnedStablecoin('0xcc71b8a0b9ea458ae7e17fa232a36816f6b27195')
    );
  }

  if (tokenName == TokenName.ONE_1INCH) {
    const _1inchIchiLpAddress = getAddress(AddressName._1INCH_ICHI_LP, chainId);
    const lpContract = getErc20Contract(_1inchIchiLpAddress, provider);
    const strategyLPs = Number(await lpContract.balanceOf(strategyAddress));
    if (strategyLPs > 0) {
      const lp_stimulus = Number(await stimulusToken.balanceOf(_1inchIchiLpAddress));
      const lp_ichi = Number(await ichi.balanceOf(_1inchIchiLpAddress));
      const lpTotal = Number(await lpContract.totalSupply());
      const ratio = strategyLPs / lpTotal;
      const strategy_lp_ichi = lp_ichi * ratio;
      const strategy_lp_stimulus = lp_stimulus * ratio;
      strategy_balance_ichi += strategy_lp_ichi;
      strategy_balance_stimulus += strategy_lp_stimulus;
    }
  }

  // =================================================================================

  // =================================================================================
  // special oneLINK logic in this section
  if (tokenName == TokenName.ONE_LINK) {
    // temp fix for oneLINK (removing price of burned stablecoins for a specific address from the total)
    oneToken_burned_tokens = Number(
      await asOneLink(oneToken).getBurnedStablecoin('0x549C0421c69Be943A2A60e76B19b4A801682cBD3')
    );
    //let oneLINK_USDC_num = Number(oneLINK_USDC) / 10 ** 6 - Number(oneLINK_burned_tokens) / 10 ** 9;

    let oneLINK_67_33_Farming_Position = await farming_V2.userInfo(8, getToken(TokenName.ONE_LINK, chainId).address);
    let oneLINK_67_33_LP = oneLINK_67_33_Farming_Position.amount;

    // NOTE: There is no 1008 Pool anymore
    let oneLINK_67_33_PoolRecord = await getPoolRecord(1008, tokenPrices, null, false, chainId);

    let totalOneLINKLP = oneLINK_67_33_PoolRecord['totalPoolLP'];
    let percentOwnership = Number(oneLINK_67_33_LP) / Number(totalOneLINKLP);

    let reserve0 = oneLINK_67_33_PoolRecord['reserve0Raw'];
    let reserve1 = oneLINK_67_33_PoolRecord['reserve1Raw'];
    let token0 = oneLINK_67_33_PoolRecord['token0'];
    let token1 = oneLINK_67_33_PoolRecord['token1'];
    let tvl = oneLINK_67_33_PoolRecord['tvl'];
    let usdValue = Number(tvl) * percentOwnership;
    let yAPY = oneLINK_67_33_PoolRecord['yearlyAPY'];

    let assets = [];
    assets.push({
      M: {
        name: { S: tokenNames[token0.toLowerCase()] },
        balance: { N: (Number(reserve0) * percentOwnership).toString() }
      }
    });
    assets.push({
      M: {
        name: { S: tokenNames[token1.toLowerCase()] },
        balance: { N: (Number(reserve1) * percentOwnership).toString() }
      }
    });
    let oneLINK_67_33_Position = {
      name: { S: '67/33 ICHI-LINK Farm' },
      LP: { N: (Number(oneLINK_67_33_LP) / 10 ** 18).toString() },
      percentOwnership: { N: (percentOwnership * 100).toString() },
      usdValue: { N: usdValue.toString() },
      assets: { L: assets }
    };

    if (stimulusPositionsUSDValue + usdValue > 0) {
      stimulusPositionsAPY =
        (stimulusPositionsUSDValue * stimulusPositionsAPY + usdValue * yAPY) / (stimulusPositionsUSDValue + usdValue);
    }
    stimulusPositionsUSDValue = stimulusPositionsUSDValue + usdValue;
    oneTokenStimulusPostions.push({ M: oneLINK_67_33_Position });
  }

  // =================================================================================

  let assets = [];
  assets.push({
    M: {
      name: { S: 'USDC' },
      balance: { N: (Number(oneToken_burned_tokens) / 10 ** decimals).toString() }
    }
  });
  // if (Number(oneToken_burned_tokens) > 0) {
  //   let unredeemedCollateralPosition = {
  //     name: { S: "unredeemed "+itemName },
  //     assets: { L: assets }
  //   };
  //   //oneTokenCollateralPostions.push({ M: unredeemedCollateralPosition });
  // }

  let oneToken_withdrawFee = 0;
  if (isV2) {
    oneToken_withdrawFee = Number(await asOneTokenV1(oneToken).redemptionFee()) / 10 ** 18;
  } else {
    oneToken_withdrawFee = Number(await asOneEth(oneToken).withdrawFee()) / 10 ** 11;
  }
  let oneToken_mintFee = 0;
  if (isV2) {
    oneToken_mintFee = Number(await asOneTokenV1(oneToken).mintingFee()) / 10 ** 18;
  } else {
    oneToken_mintFee = Number(await asOneEth(oneToken).mintFee()) / 10 ** 11;
  }
  let oneToken_mintingRatio = 0;
  if (isV2) {
    // assume USDC as collateral for V2 oneTokens for the time being
    // const mRatio = await asOneTokenV1(oneToken).getMintingRatio(getToken(TokenName.USDC, chainId).address);
    const mRatio = await asOneTokenV1(oneToken).getMintingRatio(collateralToken.address);
    oneToken_mintingRatio = Number(mRatio[0]) / 10 ** 18;
  } else {
    oneToken_mintingRatio = Number(await asOneEth(oneToken).reserveRatio()) / 10 ** 11;
  }

  let ichi_price = tokenPrices[TokenName.ICHI];
  let wbtc_price = tokenPrices[TokenName.WBTC];
  let usdc_price = tokenPrices[TokenName.USDC];
  let dai_price = tokenPrices[TokenName.DAI];
  let oja_price = tokenPrices[TokenName.OJA];
  let usdt_price = 1;
  let oneToken_price = 1;
  let onebtc_price = 1;
  let oneichi_price = 1;
  let oneuni_price = 1;
  /*onebtc_price = tokenPrices['onebtc'];
  oneuni_price = tokenPrices['oneuni'];
  if (itemName == "oneUNI") {
    oneToken_price = oneuni_price;
  }
  if (itemName == "oneBTC") {
    oneToken_price = onebtc_price;
  }*/

  stimulusPositionsUSDValue =
    stimulusPositionsUSDValue +
    Number(oneToken_stimulus_price) * (strategy_balance_stimulus / 10 ** stimulusDecimals) +
    //usdc_price * (strategy_balance_usdc_treasury / 10 ** TOKENS.usdc.decimals) +
    wbtc_price * (strategy_balance_wbtc / 10 ** getToken(TokenName.WBTC, chainId).decimals) +
    ichi_price * (strategy_balance_ichi / 10 ** getToken(TokenName.ICHI, chainId).decimals);

  // TODO: Logic change, review
  // if (tokenName == 'one1INCH') {
  if (tokenName == TokenName.ONE_1INCH) {
    stimulusPositionsUSDValue += Number(oneToken_stimulus_price) * (strategy_balance_st1inch / 10 ** stimulusDecimals) + 
    Number(oneToken_stimulus_price) * (strategy_balance_1inch / 10 ** stimulusDecimals);
  }

  // TODO: Logic change, review
  // if (tokenName == 'oneUNI') {
  if (tokenName == TokenName.ONE_UNI) {
    stimulusPositionsUSDValue += oja_price * (strategy_balance_oja / 10 ** 18);
  }

  let stimulusPositionsAllyValue = 0;
  if (strategy_balance_ally > 0) {
    const ichiPerAlly = Number(await ally.ichiPerAlly());
    stimulusPositionsAllyValue = (strategy_balance_ally / 10 ** 18) * (ichiPerAlly / 10 ** 18) * ichi_price;
    stimulusPositionsUSDValue += stimulusPositionsAllyValue;
  }

  let oneToken_stimulus_usd =
    Number(oneToken_stimulus_price) * (oneTokenStimulus / 10 ** stimulusDecimals) +
    ichi_price * (oneTokenIchi / 10 ** getToken(TokenName.ICHI, chainId).decimals) +
    stimulusPositionsUSDValue;

  let oneToken_collateral_USDC_only = usdc_price * (oneTokenUsdc / 10 ** getToken(TokenName.USDC, chainId).decimals);
  let oneToken_collateral_DAI_only = dai_price * (oneTokenDai / 10 ** getToken(TokenName.DAI, chainId).decimals);

  collateralPositionsUSDValue =
    collateralPositionsUSDValue +
    (strategy_balance_onetoken * oneToken_price) / 10 ** 18 +
    (strategy_balance_one_uni * oneuni_price) / 10 ** 18 +
    (strategy_balance_one_btc * onebtc_price) / 10 ** 18 +
    strategy_balance_one_oja / 10 ** 18 +
    (strategy_balance_one_ichi * oneichi_price) / 10 ** 18 +
    usdc_price * (strategy_balance_usdc / 10 ** getToken(TokenName.USDC, chainId).decimals) +
    usdc_price * (aux_strategy_balance_riskharbor_usdc / 10 ** getToken(TokenName.USDC, chainId).decimals) +
    usdt_price * (strategy_balance_bmi_usdt / 10 ** 18);

  let oneToken_collateral_only =
    oneToken_collateral_USDC_only + oneToken_collateral_DAI_only + collateralPositionsUSDValue;

  let oneToken_treasury_backed =
    (Number(oneToken_SUPPLY) / 10 ** decimals) * (1 - oneToken_withdrawFee) -
    oneToken_collateral_only +
    Number(oneToken_burned_tokens) / 10 ** decimals;

  let oneToken_collateral_list = [];
  if (oneToken_collateral_USDC_only > 0) {
    oneToken_collateral_list.push({
      M: {
        name: { S: 'USDC' },
        balance: { N: oneToken_collateral_USDC_only.toString() }
      }
    });
  }
  if (oneToken_collateral_DAI_only > 0) {
    oneToken_collateral_list.push({
      M: {
        name: { S: 'DAI' },
        balance: { N: oneToken_collateral_DAI_only.toString() }
      }
    });
  }

  if (
    strategy_balance_usdc > 0 ||
    strategy_balance_dai > 0 ||
    strategy_balance_onetoken > 0 ||
    strategy_balance_one_uni > 0 ||
    strategy_balance_one_btc > 0 ||
    strategy_balance_one_ichi ||
    strategy_balance_one_oja > 0 ||
    aux_strategy_balance_riskharbor_usdc > 0 ||
    strategy_balance_bmi_usdt > 0
  ) {
    const assets = [];
    if (strategy_balance_usdc > 0) {
      assets.push({
        M: {
          name: { S: 'USDC' },
          // balance: { N: Number(strategy_balance_usdc / 10 ** 6).toString() }
          balance: {
            N: Number(
              (strategy_balance_usdc + aux_strategy_balance_riskharbor_usdc) /
                10 ** getToken(TokenName.USDC, chainId).decimals
            ).toString()
          }
        }
      });
    }
    if (strategy_balance_dai > 0) {
      assets.push({
        M: {
          name: { S: 'DAI' },
          balance: {
            N: Number(strategy_balance_dai / 10 ** getToken(TokenName.DAI, chainId).decimals).toString()
          }
        }
      });
    }
    if (strategy_balance_onetoken > 0) {
      assets.push({
        M: {
          name: { S: getToken(tokenName, chainId).displayName },
          balance: { N: Number(strategy_balance_onetoken / 10 ** 18).toString() }
        }
      });
    }
    if (strategy_balance_one_uni > 0) {
      assets.push({
        M: {
          name: { S: 'oneUNI' },
          balance: { N: Number(strategy_balance_one_uni / 10 ** 18).toString() }
        }
      });
    }
    if (strategy_balance_one_btc > 0) {
      assets.push({
        M: {
          name: { S: 'oneBTC' },
          balance: { N: Number(strategy_balance_one_btc / 10 ** 18).toString() }
        }
      });
    }
    if (strategy_balance_one_oja > 0) {
      assets.push({
        M: {
          name: { S: 'oneOJA' },
          balance: { N: Number(strategy_balance_one_oja / 10 ** 18).toString() }
        }
      });
    }
    if (strategy_balance_one_ichi > 0) {
      assets.push({
        M: {
          name: { S: 'oneICHI' },
          balance: { N: Number(strategy_balance_one_ichi / 10 ** 18).toString() },
        },
      });
    }
    if (strategy_balance_bmi_usdt > 0) {
      assets.push({
        M: {
          name: { S: 'bmiICHICover' },
          balance: { N: Number(strategy_balance_bmi_usdt / 10 ** 18).toString() }
        }
      });
    }
    /* if (aux_strategy_balance_riskharbor_usdc > 0) {
        assets.push({ M: { 
          name: { S: "Risk Harbor" }, 
          balance: { N: Number(aux_strategy_balance_riskharbor_usdc / 10 ** TOKENS.usdc.decimals).toString() } 
        }});
      } */
    oneTokenCollateralPostions.push({
      M: {
        name: { S: 'Vault' },
        assets: { L: assets }
      }
    });
  }

  let oneToken_stimulus_list = [];
  oneToken_stimulus_list.push({
    M: {
      name: { S: stimulusDisplayName },
      balance: { N: Number(oneTokenStimulus / 10 ** stimulusDecimals).toString() }
    }
  });
  if (oneTokenIchi > 0) {
    oneToken_stimulus_list.push({
      M: {
        name: { S: 'ICHI' },
        balance: { N: Number(oneTokenIchi / 10 ** getToken(TokenName.ICHI, chainId).decimals).toString() }
      }
    });
  }

  if (
    strategy_balance_stimulus > 0 ||
    strategy_balance_ichi > 0 ||
    strategy_balance_wbtc > 0 ||
    strategy_balance_ally > 0 ||
    strategy_balance_oja > 0 ||
    //strategy_balance_usdc_treasury > 0 ||
    strategy_balance_st1inch > 0 ||
    strategy_balance_1inch
  ) {
    const assets = [];
    if (strategy_balance_stimulus > 0) {
      assets.push({
        M: {
          name: { S: stimulusDisplayName },
          balance: { N: Number(strategy_balance_stimulus / 10 ** stimulusDecimals).toString() }
        }
      });
    }
    if (strategy_balance_ichi > 0) {
      assets.push({
        M: {
          name: { S: 'ICHI' },
          balance: {
            N: Number(strategy_balance_ichi / 10 ** getToken(TokenName.ICHI, chainId).decimals).toString()
          }
        }
      });
    }
    if (strategy_balance_ally > 0) {
      assets.push({
        M: {
          name: { S: 'ALLY' },
          balance: { N: Number(strategy_balance_ally / 10 ** 18).toString() }
        }
      });
    }
    if (strategy_balance_wbtc > 0) {
      assets.push({
        M: {
          name: { S: 'wBTC' },
          balance: {
            N: Number(strategy_balance_wbtc / 10 ** getToken(TokenName.WBTC, chainId).decimals).toString()
          }
        }
      });
    }
    /*if (strategy_balance_usdc_treasury > 0) {
        assets.push({ M: { 
          name: { S: "USDC" }, 
          balance: { N: Number(strategy_balance_usdc_treasury / 10 ** TOKENS.usdc.decimals).toString() } 
        }});
      }*/
    if (strategy_balance_oja > 0) {
      assets.push({
        M: {
          name: { S: 'OJA' },
          balance: { N: Number(strategy_balance_oja / 10 ** 18).toString() }
        }
      });
    }

    // TODO: logic change, review
    // if (tokenName === 'one1INCH' && Number(strategy_balance_st1inch) > 0) {
    if (tokenName === TokenName.ONE_1INCH && Number(strategy_balance_st1inch) > 0) {
      assets.push({
        M: {
          name: { S: 'st1INCH' },
          balance: { N: Number(strategy_balance_st1inch / 10 ** stimulusDecimals).toString() }
        }
      });
    }
    if (tokenName === TokenName.ONE_1INCH && Number(strategy_balance_1inch) > 0) {
      assets.push({
        M: {
          name: { S: '1INCH' },
          balance: { N: Number(strategy_balance_1inch / 10 ** stimulusDecimals).toString() }
        }
      });
    }
    oneTokenStimulusPostions.push({
      M: {
        name: { S: 'Vault' },
        assets: { L: assets }
      }
    });
  }

  const oneTokenVersion = isV2 ? 2 : 1;

  let reserveRatio = 0;
  if (oneToken_treasury_backed > 0) {
    reserveRatio = oneToken_stimulus_usd / oneToken_treasury_backed;
  } else {
    reserveRatio = 100; // 10000%
  }

  let totalUSDC =
    (oneTokenUsdc + strategy_balance_usdc + aux_strategy_balance_riskharbor_usdc) /
      10 ** getToken(TokenName.USDC, chainId).decimals +
    (oneTokenDai + strategy_balance_dai) / 10 ** getToken(TokenName.DAI, chainId).decimals +
    strategy_balance_bmi_usdt / 10 ** 18;

  let res = {
    name: tokenName.toLowerCase(),
    displayName: displayName,
    base: baseName,
    usdc: totalUSDC,
    circulation: Number(oneToken_SUPPLY) / 10 ** decimals,
    collateral: oneToken_collateral_list,
    collateralPositions: oneTokenCollateralPostions,
    collateralPositionsUSD: collateralPositionsUSDValue,
    collateralUSD: oneToken_collateral_only,
    stimulus: oneToken_stimulus_list,
    stimulusUSD: oneToken_stimulus_usd,
    stimulusPositions: oneTokenStimulusPostions,
    stimulusPositionsUSD: stimulusPositionsUSDValue,
    withdrawFee: oneToken_withdrawFee,
    mintFee: oneToken_mintFee,
    mintingRatio: oneToken_mintingRatio,
    treasuryBacked: oneToken_treasury_backed,
    oneTokenVersion: oneTokenVersion,
    reserveRatio: reserveRatio
  };

  console.log(res);

  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03
  console.log(`Attempting to update table: ${tableName}, token: ${tokenName}`);
  const params: AWS.DynamoDB.UpdateItemInput = {
    TableName: tableName,
    Key: {
      name: {
        S: getToken(tokenName, chainId).tableName
      }
    },
    UpdateExpression:
      'set ' +
      'baseName = :baseName, ' +
      'address = :address, ' +
      'strategy = :strategy, ' +
      'displayName = :displayName, ' +
      'usdc = :usdc, ' +
      'circulation = :circulation, ' +
      'collateral = :collateral, ' +
      'collateralPositions = :collateralPositions, ' +
      'collateralPositionsAPY = :collateralPositionsAPY, ' +
      'collateralPositionsUSD = :collateralPositionsUSD, ' +
      'collateralUSD = :collateralUSD, ' +
      'stimulus = :stimulus, ' +
      'stimulusUSD = :stimulusUSD, ' +
      'stimulusPositions = :stimulusPositions, ' +
      'stimulusPositionsAPY = :stimulusPositionsAPY, ' +
      'stimulusPositionsUSD = :stimulusPositionsUSD, ' +
      'withdrawFee = :withdrawFee, ' +
      'mintFee = :mintFee, ' +
      'mintingRatio = :mintingRatio, ' +
      'treasuryBacked = :treasuryBacked, ' +
      'chainId = :chainId, ' +
      'tradeUrl = :tradeUrl, ' +
      'isLegacy = :isLegacy, ' +
      'oneTokenVersion = :oneTokenVersion, ' +
      'reserveRatio = :reserveRatio',
    ExpressionAttributeValues: {
      ':baseName': { S: baseName },
      ':address': { S: oneTokenAddress },
      ':strategy': { S: strategyAddress },
      ':displayName': { S: displayName },
      ':usdc': { N: Number(totalUSDC).toString() },
      ':circulation': { N: (Number(oneToken_SUPPLY) / 10 ** decimals).toString() },
      ':collateral': { L: oneToken_collateral_list },
      ':collateralPositions': { L: oneTokenCollateralPostions },
      ':collateralPositionsAPY': { N: collateralPositionsAPY.toString() },
      ':collateralPositionsUSD': { N: Number(collateralPositionsUSDValue).toString() },
      ':collateralUSD': { N: Number(oneToken_collateral_only).toString() },
      ':stimulus': { L: oneToken_stimulus_list },
      ':stimulusUSD': { N: Number(oneToken_stimulus_usd).toString() },
      ':stimulusPositions': { L: oneTokenStimulusPostions },
      ':stimulusPositionsAPY': { N: stimulusPositionsAPY.toString() },
      ':stimulusPositionsUSD': { N: Number(stimulusPositionsUSDValue).toString() },
      ':withdrawFee': { N: oneToken_withdrawFee.toString() },
      ':mintFee': { N: oneToken_mintFee.toString() },
      ':mintingRatio': { N: oneToken_mintingRatio.toString() },
      ':treasuryBacked': { N: Number(oneToken_treasury_backed).toString() },
      ':chainId': { N: ChainId.Mainnet.toString() },
      ':tradeUrl': { S: tradeUrl },
      ':isLegacy': { BOOL: isLegacy },
      ':oneTokenVersion': { N: Number(oneTokenVersion).toString() },
      ':reserveRatio': { N: Number(reserveRatio).toString() }
    },
    ReturnValues: 'UPDATED_NEW'
  };

  try {
    // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html#API_UpdateItem_Examples
    const result = await dbClient.updateItem(params).promise();
    console.log(`Successfully updated table: ${tableName}`);
    console.log(JSON.stringify(result));
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }
};
