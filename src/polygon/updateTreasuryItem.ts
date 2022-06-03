import { APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { ethers } from 'ethers';
import { ADDRESSES, TOKENS, CHAIN_ID } from './configPolygon';
import FARMING_V2_ABI from '../abis/FARMING_V2_ABI.json';
import ERC20_ABI from '../abis/ERC20_ABI.json';
import VAULT_ABI from '../abis/ICHI_VAULT_ABI.json';
import ONETOKEN_ABI from '../abis/ONETOKEN_ABI.json';
import UNISWAP_V3_POSITIONS from '../abis/UNISWAP_V3_POSITIONS_ABI.json';
import { ChainId, getProvider } from '../providers';
import { dbClient } from '../configMainnet';

const getABI = async function () {
  return ONETOKEN_ABI;
};

const getOneTokenAttributes = async function (tokenName: string) {
  let template = {
    address: TOKENS[tokenName]['address'],
    decimals: TOKENS[tokenName]['decimals'],
    strategy: TOKENS[tokenName]['strategy'],
    aux_strategy: TOKENS[tokenName]['aux_strategy'],
    tradeUrl: TOKENS[tokenName]['tradeUrl'],
    displayName: TOKENS[tokenName]['displayName'],
    stimulus_address: '',
    stimulus_name: TOKENS[tokenName]['stimulusName'],
    stimulus_display_name: TOKENS[tokenName]['stimulusDisplayName'],
    stimulus_decimals: 18,
    abi_type: 'ONETOKEN',
    base_name: tokenName.toLowerCase(),
    isV2: TOKENS[tokenName]['isV2'],
    ichiVault: {
      address: TOKENS[tokenName]['ichiVault'] ? TOKENS[tokenName]['ichiVault']['address'] : '',
      farm: TOKENS[tokenName]['ichiVault'] ? TOKENS[tokenName]['ichiVault']['farm'] : 0,
      externalFarm: TOKENS[tokenName]['ichiVault'] ? TOKENS[tokenName]['ichiVault']['externalFarm'] : '',
      scarceTokenName: TOKENS[tokenName]['ichiVault'] ? TOKENS[tokenName]['ichiVault']['scarceTokenName'] : '',
      scarceTokenDecimals: TOKENS[tokenName]['ichiVault'] ? TOKENS[tokenName]['ichiVault']['scarceTokenDecimals'] : 18,
      scarceToken: TOKENS[tokenName]['ichiVault'] ? TOKENS[tokenName]['ichiVault']['scarceToken'] : ''
    }
  };

  if (tokenName == 'pol_onebtc') {
    template.stimulus_decimals = 8;
  }

  template.stimulus_address = TOKENS[template.stimulus_name]['address'];

  return template;
};

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateTreasuryItem = async (
  tableName: string,
  itemName: string,
  tokenPrices: { [name: string]: number }
): Promise<APIGatewayProxyResult> => {
  const provider = await getProvider(ChainId.polygon);

  const farming_V2 = new ethers.Contract(ADDRESSES.farming_V2, FARMING_V2_ABI, provider);

  const uniswap_V3_positions = new ethers.Contract(ADDRESSES.uniswap_V3_positions, UNISWAP_V3_POSITIONS, provider);

  const attr = await getOneTokenAttributes(itemName.toLowerCase());
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
  const oneTokenABI = await getABI();

  const ICHI = new ethers.Contract(TOKENS['pol_ichi']['address'], ERC20_ABI, provider);
  const stimulusToken = new ethers.Contract(stimulusTokenAddress, ERC20_ABI, provider);
  const USDC = new ethers.Contract(TOKENS['pol_usdc']['address'], ERC20_ABI, provider);
  const oneToken = new ethers.Contract(oneTokenAddress, oneTokenABI, provider);

  const oneToken_USDC = Number(await USDC.balanceOf(oneTokenAddress));
  const oneToken_stimulus = Number(await stimulusToken.balanceOf(oneTokenAddress));
  const oneToken_ichi = Number(await ICHI.balanceOf(oneTokenAddress));

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
    strategy_balance_usdc += Number(await USDC.balanceOf(strategyAddress));

    strategy_balance_stimulus += Number(await stimulusToken.balanceOf(strategyAddress));
    strategy_balance_onetoken += Number(await oneToken.balanceOf(strategyAddress));
    strategy_balance_ichi += Number(await ICHI.balanceOf(strategyAddress));

    let strategy_balance_vault_lp = 0;
    if (attr.ichiVault.farm > 0 && attr.ichiVault.externalFarm === '') {
      const userInfo = await farming_V2.userInfo(attr.ichiVault.farm, strategyAddress);
      strategy_balance_vault_lp += Number(userInfo.amount);
    }
    if (attr.ichiVault.address !== '') {
      const vault = new ethers.Contract(attr.ichiVault.address, VAULT_ABI, provider);
      strategy_balance_vault_lp += Number(await vault.balanceOf(strategyAddress));
      const vault_total_lp = Number(await vault.totalSupply());
      const vault_total_amounts = await vault.getTotalAmounts();
      if (strategy_balance_vault_lp > 0) {
        const vault_ratio = strategy_balance_vault_lp / vault_total_lp;
        if (attr.ichiVault.scarceToken === 'token0') {
          if (attr.ichiVault.scarceTokenName === 'pol_ichi') {
            strategy_balance_ichi += Number(vault_total_amounts.total0) * vault_ratio;
          } else {
            strategy_balance_stimulus += Number(vault_total_amounts.total0) * vault_ratio;
          }
          strategy_balance_onetoken += Number(vault_total_amounts.total1) * vault_ratio;
        } else {
          if (attr.ichiVault.scarceTokenName === 'pol_ichi') {
            strategy_balance_ichi += Number(vault_total_amounts.total1) * vault_ratio;
          } else {
            strategy_balance_stimulus += Number(vault_total_amounts.total1) * vault_ratio;
          }
          strategy_balance_onetoken += Number(vault_total_amounts.total0) * vault_ratio;
        }
      }
    }
  }

  uni_v3_positions = Number(await uniswap_V3_positions.balanceOf(strategyAddress));
  if (uni_v3_positions > 0) {
    /*let all_v3_positions = await callDebunkOpenAPI(strategyAddress, DEBUNK_PROTOCOLS.UNI_V3);
    if (all_v3_positions.data && all_v3_positions.data.portfolio_item_list && 
      all_v3_positions.data.portfolio_item_list.length > 0) {
      for (let i = 0; i < all_v3_positions.data.portfolio_item_list.length; i++ ) {
        let detail = all_v3_positions.data.portfolio_item_list[i].detail;
        if (detail.supply_token_list && detail.supply_token_list.length > 0) {
          let usdc_in_position = 0;
          let isCollateral = false;
          for (let k = 0; k < detail.supply_token_list.length; k++ ) {
            let supply_token = detail.supply_token_list[k];
            if (supply_token.id.toLowerCase() === oneTokenAddress.toLowerCase()) {
              isCollateral = true;
              strategy_balance_onetoken += Number(supply_token.amount) * 10 ** 18;
            } else if (supply_token.id.toLowerCase() === TOKENS['oneuni']['address'].toLowerCase()) {
              if (itemName !== 'oneUNI') {
                strategy_balance_one_uni += Number(supply_token.amount) * 10 ** 18;
              } else {
                strategy_balance_onetoken += Number(supply_token.amount) * 10 ** 18;
              }
            } else if (supply_token.id.toLowerCase() === TOKENS['ichi']['address'].toLowerCase()){
              strategy_balance_ichi += Number(supply_token.amount) * 10 ** TOKENS.ichi.decimals;
            }
            if (supply_token.id.toLowerCase() === TOKENS['usdc']['address'].toLowerCase()) {
              usdc_in_position += Number(supply_token.amount) * 10 ** 6;
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
    }*/
  }

  if (auxStrategies.length > 0) {
    // there could be multiple aux strategies
    for (let i = 0; i < auxStrategies.length; i++) {
      let auxStrategyAddress = auxStrategies[i];

      // aux strategy may own USDC
      aux_strategy_balance_usdc = Number(await USDC.balanceOf(auxStrategyAddress));
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
  if (Number(oneToken_burned_tokens) > 0) {
    let unredeemedCollateralPosition = {
      name: { S: 'unredeemed ' + itemName },
      assets: { L: assets }
    };
    //oneTokenCollateralPostions.push({ M: unredeemedCollateralPosition });
  }

  let oneToken_withdrawFee = Number(await oneToken.redemptionFee()) / 10 ** 18;
  let oneToken_mintFee = Number(await oneToken.mintingFee()) / 10 ** 18;
  const mRatio = await oneToken.getMintingRatio(TOKENS['pol_usdc']['address']);
  let oneToken_mintingRatio = Number(mRatio[0]) / 10 ** 18;

  let ichi_price = tokenPrices['pol_ichi'];
  let usdc_price = tokenPrices['pol_usdc'];

  stimulusPositionsUSDValue =
    stimulusPositionsUSDValue +
    Number(oneToken_stimulus_price) * (strategy_balance_stimulus / 10 ** stimulusDecimals) +
    usdc_price * (strategy_balance_usdc_treasury / 10 ** 6) +
    ichi_price * (strategy_balance_ichi / 10 ** 18);

  let oneToken_stimulus_usd =
    Number(oneToken_stimulus_price) * (oneToken_stimulus / 10 ** stimulusDecimals) +
    ichi_price * (oneToken_ichi / 10 ** 18) +
    stimulusPositionsUSDValue;

  let oneToken_collateral_USDC_only = usdc_price * (oneToken_USDC / 10 ** 6);

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
      assets.push({
        M: {
          name: { S: TOKENS[itemName.toLowerCase()]['displayName'] },
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
      balance: { N: Number(oneToken_stimulus / 10 ** stimulusDecimals).toString() }
    }
  });
  if (oneToken_ichi > 0) {
    oneToken_stimulus_list.push({
      M: {
        name: { S: 'ICHI' },
        balance: { N: Number(oneToken_ichi / 10 ** 18).toString() }
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

  let totalUSDC = (oneToken_USDC + strategy_balance_usdc) / 10 ** 6;

  let res = {
    name: itemName.toLowerCase(),
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
  console.log(`Attempting to update table: ${tableName}, token: ${itemName}`);
  const params: AWS.DynamoDB.UpdateItemInput = {
    TableName: tableName,
    Key: {
      name: {
        S: itemName.toLowerCase()
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
      ':chainId': { N: Number(CHAIN_ID).toString() },
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
