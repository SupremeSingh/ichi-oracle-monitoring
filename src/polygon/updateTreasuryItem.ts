import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { dbClient } from '../configMainnet';
import {
  getDebankPortfolio,
  getProvider,
  getToken,
  TokenName,
  AddressName,
  getAddress,
  ChainId,
  DebankProtocolName,
  getErc20Contract,
  getIchiVaultContract,
  getOneTokenV1Contract,
  getFarmingV2Contract,
  getUniswapV3PositionsContract,
  PartialRecord
} from '@ichidao/ichi-sdk';

const getOneTokenAttributes = async function (tokenName: TokenName, chainId: ChainId) {
  const token = getToken(tokenName, chainId);
  let template = {
    address: token.address,
    decimals: token.decimals,
    strategy: token.strategy,
    aux_strategy: token.auxStrategy,
    tradeUrl: token.tradeUrl,
    displayName: token.displayName,
    stimulus_address: '',
    stimulus_name: token.stimulusName,
    stimulus_display_name: token.stimulusDisplayName,
    stimulus_decimals: 18,
    abi_type: 'ONETOKEN',
    base_name: tokenName.toLowerCase(),
    isV2: token.isV2,
    ichiVault: {
      address: token.ichiVault ? token.ichiVault.address : '',
      farm: token.ichiVault ? token.ichiVault.farm : 0,
      externalFarm: token.ichiVault ? token.ichiVault.externalFarm : '',
      scarceTokenName: token.ichiVault ? token.ichiVault.scarceTokenName : '',
      scarceTokenDecimals: token.ichiVault ? token.ichiVault.scarceTokenDecimals : 18,
      scarceToken: token.ichiVault ? token.ichiVault.scarceToken : ''
    }
  };

  if (tokenName === TokenName.ONE_BTC) {
    template.stimulus_decimals = 8;
  }

  const stimulusToken = getToken(template.stimulus_name as TokenName, chainId);
  template.stimulus_address = stimulusToken.address;

  return template;
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateTreasuryItem = async (
  tableName: string,
  tokenName: TokenName,
  tokenPrices: PartialRecord<TokenName, number>,
  chainId: ChainId
): Promise<APIGatewayProxyResult> => {
  const provider = await getProvider(chainId);
  const usdcToken = getToken(TokenName.USDC, chainId);
  const ichiV2Token = getToken(TokenName.ICHI_V2, chainId);

  const farmingV2 = getFarmingV2Contract(getAddress(AddressName.FARMING_V2, chainId), provider);

  const uniswapV3Positions = getUniswapV3PositionsContract(
    getAddress(AddressName.UNISWAP_V3_POSITIONS, chainId),
    provider
  );

  const attr = await getOneTokenAttributes(tokenName, chainId);
  const oneTokenAddress = attr.address;
  const strategyAddress = attr.strategy;
  const auxStrategies = attr.aux_strategy;
  const stimulusTokenAddress = attr.stimulus_address;
  const stimulusDisplayName = attr.stimulus_display_name;
  const stimulusTokenName = attr.stimulus_name;
  const stimulusDecimals = attr.stimulus_decimals;
  const baseName = attr.base_name;
  const displayName = attr.displayName;
  const decimals = attr.decimals;
  const tradeUrl = attr.tradeUrl;
  const isV2 = attr.isV2;
  // const oneTokenABI = await getABI();

  const ichi = getErc20Contract(ichiV2Token.address, provider);
  const stimulusToken = getErc20Contract(stimulusTokenAddress, provider);
  const usdc = getErc20Contract(usdcToken.address, provider);
  const oneToken = getOneTokenV1Contract(oneTokenAddress, provider);

  const oneTokenUsdc = Number(await usdc.balanceOf(oneTokenAddress));
  const oneTokenStimulus = Number(await stimulusToken.balanceOf(oneTokenAddress));
  const oneTokenIchi = Number(await ichi.balanceOf(oneTokenAddress));

  // =================================================================================
  // get balances from the strategy, if it exists

  let strategy_balance_usdc = 0;
  let strategy_balance_usdc_treasury = 0;
  let strategy_balance_stimulus = 0;
  let strategy_balance_onetoken = 0;
  let strategy_balance_ichi = 0;
  let uni_v3_positions = 0;
  let aux_strategy_balance_usdc = 0;

  if (strategyAddress !== '') {
    strategy_balance_usdc += Number(await usdc.balanceOf(strategyAddress));

    strategy_balance_stimulus += Number(await stimulusToken.balanceOf(strategyAddress));
    strategy_balance_onetoken += Number(await oneToken.balanceOf(strategyAddress));
    strategy_balance_ichi += Number(await ichi.balanceOf(strategyAddress));

    let strategy_balance_vault_lp = 0;
    if (attr.ichiVault.farm > 0 && attr.ichiVault.externalFarm === '') {
      const userInfo = await farmingV2.userInfo(attr.ichiVault.farm, strategyAddress);
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
          // TODO: I have a feeling these are hard coded in Dynamo and we shouldn't use TokenName.ICHI_V2
          // if (attr.ichiVault.scarceTokenName === 'pol_ichi') {
          if (attr.ichiVault.scarceTokenName === TokenName.ICHI) {
            strategy_balance_ichi += Number(vault_total_amounts.total0) * vault_ratio;
          } else {
            strategy_balance_stimulus += Number(vault_total_amounts.total0) * vault_ratio;
          }
          strategy_balance_onetoken += Number(vault_total_amounts.total1) * vault_ratio;
        } else {
          // TODO: I have a feeling these are hard coded in Dynamo and we shouldn't use TokenName.ICHI_V2
          // if (attr.ichiVault.scarceTokenName === 'pol_ichi') {
          // TODO: Logic change, removed pol_
          if (attr.ichiVault.scarceTokenName === TokenName.ICHI) {
            strategy_balance_ichi += Number(vault_total_amounts.total1) * vault_ratio;
          } else {
            strategy_balance_stimulus += Number(vault_total_amounts.total1) * vault_ratio;
          }
          strategy_balance_onetoken += Number(vault_total_amounts.total0) * vault_ratio;
        }
      }
    }
  }

  uni_v3_positions = Number(await uniswapV3Positions.balanceOf(strategyAddress));
  if (uni_v3_positions > 0) {
    let all_v3_positions = await getDebankPortfolio(strategyAddress, DebankProtocolName.UNI_V3);
    if (all_v3_positions && all_v3_positions.portfolio_item_list && all_v3_positions.portfolio_item_list.length > 0) {
      for (let i = 0; i < all_v3_positions.portfolio_item_list.length; i++) {
        let detail = all_v3_positions.portfolio_item_list[i].detail;
        if (detail.supply_token_list && detail.supply_token_list.length > 0) {
          let usdc_in_position = 0;
          let isCollateral = false;
          for (let k = 0; k < detail.supply_token_list.length; k++) {
            let supply_token = detail.supply_token_list[k];
            if (supply_token.id.toLowerCase() === oneTokenAddress.toLowerCase()) {
              isCollateral = true;
              strategy_balance_onetoken += Number(supply_token.amount) * 10 ** 18;
            } else if (supply_token.id.toLowerCase() === ichiV2Token.address.toLowerCase()) {
              strategy_balance_ichi += Number(supply_token.amount) * 10 ** ichiV2Token.decimals;
            }
            if (supply_token.id.toLowerCase() === usdcToken.address.toLowerCase()) {
              usdc_in_position += Number(supply_token.amount) * 10 ** usdcToken.decimals;
            }
            if (supply_token.id.toLowerCase() === stimulusTokenAddress.toLowerCase()) {
              strategy_balance_stimulus += Number(supply_token.amount) * 10 ** stimulusDecimals;
            }
          }
          if (isCollateral) {
            strategy_balance_usdc += usdc_in_position;
          } else {
            strategy_balance_usdc_treasury += usdc_in_position;
          }
        }
      }
    }
  }

  if (auxStrategies.length > 0) {
    // there could be multiple aux strategies
    for (let i = 0; i < auxStrategies.length; i++) {
      let auxStrategyAddress = auxStrategies[i];

      // aux strategy may own USDC
      aux_strategy_balance_usdc = Number(await usdc.balanceOf(auxStrategyAddress));
      strategy_balance_usdc += aux_strategy_balance_usdc;
    }
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

  let assets = [];
  assets.push({
    M: {
      name: { S: 'USDC' },
      balance: { N: (Number(oneToken_burned_tokens) / 10 ** decimals).toString() }
    }
  });
  // 06/28/2022 - Unused so commenting out
  // if (Number(oneToken_burned_tokens) > 0) {
  //   let unredeemedCollateralPosition = {
  //     name: { S: 'unredeemed ' + tokenName },
  //     assets: { L: assets }
  //   };
  //   //oneTokenCollateralPostions.push({ M: unredeemedCollateralPosition });
  // }

  let oneToken_withdrawFee = Number(await oneToken.redemptionFee()) / 10 ** 18;
  let oneToken_mintFee = Number(await oneToken.mintingFee()) / 10 ** 18;
  const mRatio = await oneToken.getMintingRatio(usdcToken.address);
  let oneToken_mintingRatio = Number(mRatio[0]) / 10 ** 18;

  let ichi_price = tokenPrices[TokenName.ICHI];
  let usdc_price = tokenPrices[TokenName.USDC];

  console.log(`tokenPrices`, tokenPrices);

  stimulusPositionsUSDValue =
    stimulusPositionsUSDValue +
    Number(oneToken_stimulus_price) * (strategy_balance_stimulus / 10 ** stimulusDecimals) +
    usdc_price * (strategy_balance_usdc_treasury / 10 ** 6) +
    ichi_price * (strategy_balance_ichi / 10 ** 18);

  let oneToken_stimulus_usd =
    Number(oneToken_stimulus_price) * (oneTokenStimulus / 10 ** stimulusDecimals) +
    ichi_price * (oneTokenIchi / 10 ** 18) +
    stimulusPositionsUSDValue;

  let oneToken_collateral_USDC_only = usdc_price * (oneTokenUsdc / 10 ** 6);

  collateralPositionsUSDValue =
    collateralPositionsUSDValue + strategy_balance_onetoken / 10 ** 18 + usdc_price * (strategy_balance_usdc / 10 ** 6);

  let oneToken_collateral_only = oneToken_collateral_USDC_only + collateralPositionsUSDValue;

  let oneToken_treasury_backed =
    (Number(oneToken_SUPPLY) / 10 ** decimals) * (1 - oneToken_withdrawFee) -
    oneToken_collateral_only +
    Number(oneToken_burned_tokens) / 10 ** decimals;

  let oneToken_collateral_list = [];
  oneToken_collateral_list.push({
    M: {
      name: { S: 'USDC' },
      balance: { N: oneToken_collateral_USDC_only.toString() }
    }
  });

  if (strategy_balance_usdc > 0 || strategy_balance_onetoken > 0) {
    const assets = [];
    if (strategy_balance_usdc > 0) {
      assets.push({
        M: {
          name: { S: 'USDC' },
          balance: { N: Number(strategy_balance_usdc / 10 ** 6).toString() }
        }
      });
    }
    if (strategy_balance_onetoken > 0) {
      const token = getToken(tokenName, chainId);
      assets.push({
        M: {
          name: { S: token.displayName },
          balance: { N: Number(strategy_balance_onetoken / 10 ** 18).toString() }
        }
      });
    }
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
        balance: { N: Number(oneTokenIchi / 10 ** 18).toString() }
      }
    });
  }

  if (strategy_balance_stimulus > 0 || strategy_balance_ichi > 0 || strategy_balance_usdc_treasury > 0) {
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
          balance: { N: Number(strategy_balance_ichi / 10 ** 18).toString() }
        }
      });
    }
    if (strategy_balance_usdc_treasury > 0) {
      assets.push({
        M: {
          name: { S: 'USDC' },
          balance: { N: Number(strategy_balance_usdc_treasury / 10 ** 6).toString() }
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

  let totalUSDC = (oneTokenUsdc + strategy_balance_usdc) / 10 ** 6;

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

  const isLegacy = false;

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
      ':chainId': { N: ChainId.Polygon.toString() },
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
