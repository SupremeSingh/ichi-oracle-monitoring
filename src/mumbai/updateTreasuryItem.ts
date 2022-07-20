import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ethers } from 'ethers';
import { dbClient } from '../configMainnet';
import {
  ChainId,
  getErc20Contract,
  getOneTokenAttributes,
  getProvider,
  getToken,
  TokenName,
  getOneTokenV1Contract,
  asStablecoinV2,
  PartialRecord,
  getIchiVaultContract
} from '@ichidao/ichi-sdk';

export const updateTreasuryItem = async (
  tableName: string,
  tokenName: TokenName,
  tokenPrices: PartialRecord<TokenName, number>,
  chainId: ChainId
): Promise<APIGatewayProxyResult> => {
  const attr = getOneTokenAttributes(tokenName, chainId);
  const oneTokenAddress = attr.address;
  const strategyAddress = attr.strategy;
  const stimulusTokenAddress = attr.stimulus_address;
  const stimulusDisplayName = attr.stimulus_display_name;
  const stimulusTokenName = attr.stimulus_name;
  const stimulusDecimals = attr.stimulus_decimals;
  const usdcName = attr.collateral_name;
  const decimals = attr.decimals;
  const baseName = attr.base_name;
  const displayName = attr.display_name;
  const tradeUrl = attr.tradeUrl;
  const isV2 = attr.isV2;

  const provider = await getProvider(chainId);
  const stimulusToken = getErc20Contract(stimulusTokenAddress, provider);
  const usdcContract = getErc20Contract(getToken(usdcName as TokenName, chainId).address, provider);
  const oneToken = getOneTokenV1Contract(oneTokenAddress, provider);
  //const ICHI = new ethers.Contract(TOKENS['test_ichi']['address'], ERC20_ABI, provider);

  // =================================================================================
  // get balances from the strategy, if it exists

  let strategy_balance_usdc = 0;
  let strategy_balance_stimulus = 0;
  let strategy_balance_onetoken = 0;
  let strategy_balance_ichi = 0;
  if (strategyAddress !== '') {
    strategy_balance_usdc = Number(await usdcContract.balanceOf(strategyAddress));
    strategy_balance_stimulus = Number(await stimulusToken.balanceOf(strategyAddress));
    strategy_balance_onetoken = Number(await oneToken.balanceOf(strategyAddress));
    //strategy_balance_ichi = Number(await ICHI.balanceOf(strategyAddress));

    let strategy_balance_vault_lp = 0;
    /*if (attr.ichiVault.farm > 0) {
      const farming_V2 = new ethers.Contract(ADDRESSES.farming_V2, FARMING_V2_ABI, provider);
      const userInfo = await farming_V2.userInfo(attr.ichiVault.farm, strategyAddress);
      strategy_balance_vault_lp += Number(userInfo.amount);
    }*/
    if (attr.ichiVault.address !== '') {
      const vault = getIchiVaultContract(attr.ichiVault.address, provider);
      strategy_balance_vault_lp += Number(await vault.balanceOf(strategyAddress));
      const vault_total_lp = Number(await vault.totalSupply());
      const vault_total_amounts = await vault.getTotalAmounts();
      const vault_ratio = strategy_balance_vault_lp / vault_total_lp;
      if (attr.ichiVault.ichi === 'token0') {
        strategy_balance_ichi += Number(vault_total_amounts.total0) * vault_ratio;
        strategy_balance_onetoken += Number(vault_total_amounts.total1) * vault_ratio;
      } else {
        strategy_balance_ichi += Number(vault_total_amounts.total1) * vault_ratio;
        strategy_balance_onetoken += Number(vault_total_amounts.total0) * vault_ratio;
      }
    }
  }

  let oneToken_USDC = Number(await usdcContract.balanceOf(oneTokenAddress));
  const oneToken_stimulus = Number(await stimulusToken.balanceOf(oneTokenAddress));
  const oneToken_ichi = 0;
  //const oneToken_ichi = Number(await ICHI.balanceOf(oneTokenAddress));

  let oneToken_stimulus_price = tokenPrices[stimulusTokenName.toLowerCase()];

  let oneTokenCollateralPostions = [];
  let oneTokenStimulusPostions = [];

  let stimulusPositionsUSDValue = 0;
  let collateralPositionsUSDValue = 0;

  let stimulusPositionsAPY = 0;
  let collateralPositionsAPY = 0;

  const oneToken_SUPPLY = await oneToken.totalSupply();

  let oneToken_withdrawFee = 0;
  if (isV2) {
    oneToken_withdrawFee = Number(await oneToken.redemptionFee()) / 10 ** 18;
  } else {
    oneToken_withdrawFee = Number(await asStablecoinV2(oneToken).withdrawFee()) / 10 ** 11;
  }
  let oneToken_mintFee = 0;
  if (isV2) {
    oneToken_mintFee = Number(await oneToken.mintingFee()) / 10 ** 18;
  } else {
    oneToken_mintFee = Number(await asStablecoinV2(oneToken).mintFee()) / 10 ** 11;
  }
  let oneToken_mintingRatio = 0;
  if (isV2) {
    // assume USDC as collateral for V2 oneTokens for the time being
    const mRatio = await oneToken.getMintingRatio(getToken(usdcName as TokenName, chainId).address);
    oneToken_mintingRatio = Number(mRatio[0]) / 10 ** 18;
  } else {
    oneToken_mintingRatio = Number(await asStablecoinV2(oneToken).reserveRatio()) / 10 ** 11;
  }

  // TODO: Logic change
  // let ichi_price = tokenPrices['test_ichi'];
  let ichi_price = tokenPrices[TokenName.ICHI];

  stimulusPositionsUSDValue =
    stimulusPositionsUSDValue +
    Number(oneToken_stimulus_price) * (strategy_balance_stimulus / 10 ** stimulusDecimals) +
    ichi_price * (strategy_balance_ichi / 10 ** 9);

  let oneToken_stimulus_usd =
    Number(oneToken_stimulus_price) * (oneToken_stimulus / 10 ** stimulusDecimals) +
    ichi_price * (oneToken_ichi / 10 ** 9) +
    stimulusPositionsUSDValue;

  let usdc_price = tokenPrices[usdcName];
  let oneToken_collateral_USDC_only = usdc_price * (oneToken_USDC / 10 ** 6);

  collateralPositionsUSDValue =
    collateralPositionsUSDValue + strategy_balance_onetoken / 10 ** 18 + usdc_price * (strategy_balance_usdc / 10 ** 6);

  let oneToken_collateral_only = oneToken_collateral_USDC_only + collateralPositionsUSDValue;

  let oneToken_treasury_backed =
    (Number(oneToken_SUPPLY) / 10 ** decimals) * (1 - oneToken_withdrawFee) - oneToken_collateral_only;

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
      assets.push({
        M: {
          name: { S: getToken(tokenName, chainId).displayName },
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
      balance: { N: Number(oneToken_stimulus / 10 ** 18).toString() }
    }
  });
  if (oneToken_ichi > 0) {
    oneToken_stimulus_list.push({
      M: {
        name: { S: 'ICHI' },
        balance: { N: Number(oneToken_ichi / 10 ** 9).toString() }
      }
    });
  }

  if (strategy_balance_stimulus > 0 || strategy_balance_ichi > 0) {
    const assets = [];
    if (strategy_balance_stimulus > 0) {
      assets.push({
        M: {
          name: { S: stimulusDisplayName },
          balance: { N: Number(strategy_balance_stimulus / 10 ** 18).toString() }
        }
      });
    }
    if (strategy_balance_ichi > 0) {
      assets.push({
        M: {
          name: { S: 'ICHI' },
          balance: { N: Number(strategy_balance_ichi / 10 ** 9).toString() }
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
  }

  let res = {
    name: tokenName.toLowerCase(),
    displayName: tokenName,
    base: baseName,
    usdc: (oneToken_USDC + strategy_balance_usdc) / 10 ** 6,
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
        S: tokenName.toLowerCase()
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
      ':usdc': { N: ((oneToken_USDC + strategy_balance_usdc) / 10 ** 6).toString() },
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
      ':chainId': { N: chainId.toString() },
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
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }
};
