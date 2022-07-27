import { APIGatewayProxyResult } from 'aws-lambda';
import { dbClient } from './configMainnet';
import { getOneTokenPriceFromVault } from './subgraph/ichi_vaults';
import {
  ChainId,
  getProvider,
  lookUpTokenPrices,
  getToken,
  TokenName,
  getXICHIPrice,
  getVBTCPrice,
  getMemberTokenPrice,
  getStimulusUSDPrice,
  getStimulusOraclePrice,
  getAddress,
  AddressName,
  getErc20Contract
} from '@ichidao/ichi-sdk';

// https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a
// https://code.visualstudio.com/docs/typescript/typescript-debugging
export const updateToken = async (
  tableName: string,
  tokenName: TokenName,
  chainId: ChainId
): Promise<APIGatewayProxyResult> => {
  const provider = await getProvider(chainId);
  const token = getToken(tokenName, chainId);
  let price = 0;
  let priceChange = 0;

  const tokenContract = getErc20Contract(token.address, provider);

  let totalSupply = await tokenContract.totalSupply();
  let totalTokens = Number(totalSupply) / 10 ** token.decimals;
  let circulating = totalTokens;

  if (tokenName == TokenName.ICHI) {
    // const ichiV2Contract = new ethers.Contract(TOKENS.ichi_v2.address, ERC20_ABI as ContractInterface, provider);
    const ichiV2Contract = getErc20Contract(getToken(TokenName.ICHI_V2, chainId).address, provider);
    let ichiV2TotalSupply = Number(await ichiV2Contract.totalSupply()) / 10 ** 18;

    const v1Balance = Number(await tokenContract.balanceOf(getAddress(AddressName.FARMING_V1, chainId))) / 10 ** 9;
    const v2Balance = Number(await tokenContract.balanceOf(getAddress(AddressName.FARMING_V2, chainId))) / 10 ** 9;
    const v3Balance = Number(await ichiV2Contract.balanceOf(getAddress(AddressName.FARMING_V3, chainId))) / 10 ** 18;
    const communityGnosisBalance =
      Number(await tokenContract.balanceOf(getAddress(AddressName.ICHI_COMMUNITY_GNOSIS, chainId))) / 10 ** 9;
    const ichiV2GnosisBalance =
      Number(await ichiV2Contract.balanceOf(getAddress(AddressName.ICHI_V2_GNOSIS, chainId))) / 10 ** 18;
    const ichiAllyBalance = Number(await ichiV2Contract.balanceOf(getAddress(AddressName.ALLY, chainId))) / 10 ** 18;
    const ichiInV2Balance =
      Number(await tokenContract.balanceOf(getToken(TokenName.ICHI_V2, chainId).address)) / 10 ** 9;
    const ichiV2GSRBalance = Number(await ichiV2Contract.balanceOf(getAddress(AddressName.GSR, chainId))) / 10 ** 18

    circulating =
      totalTokens +
      ichiV2TotalSupply -
      v1Balance -
      v2Balance -
      v3Balance -
      ichiInV2Balance -
      communityGnosisBalance -
      ichiV2GnosisBalance -
      ichiAllyBalance - 
      ichiV2GSRBalance;

      // console.log(circulating);
  }

  if (tokenName == TokenName.ICHI_V2) {
    const ichiContract = getErc20Contract(getToken(TokenName.ICHI, chainId).address, provider);
    let ichiTotalSupply = Number(await ichiContract.totalSupply()) / 10 ** 9;

    const v1Balance = Number(await ichiContract.balanceOf(getAddress(AddressName.FARMING_V1, chainId))) / 10 ** 9;
    const v2Balance = Number(await ichiContract.balanceOf(getAddress(AddressName.FARMING_V2, chainId))) / 10 ** 9;
    const v3Balance = Number(await tokenContract.balanceOf(getAddress(AddressName.FARMING_V3, chainId))) / 10 ** 18;
    const communityGnosisBalance =
      Number(await ichiContract.balanceOf(getAddress(AddressName.ICHI_COMMUNITY_GNOSIS, chainId))) / 10 ** 9;
    const ichiV2GnosisBalance =
      Number(await tokenContract.balanceOf(getAddress(AddressName.ICHI_V2_GNOSIS, chainId))) / 10 ** 18;
    const ichiAllyBalance = Number(await tokenContract.balanceOf(getAddress(AddressName.ALLY, chainId))) / 10 ** 18;
    const ichiInV2Balance =
      Number(await ichiContract.balanceOf(getToken(TokenName.ICHI_V2, chainId).address)) / 10 ** 9;
    const ichiGSRBalance = Number(await ichiContract.balanceOf(getAddress(AddressName.GSR, chainId))) / 10 ** 18

    circulating =
      totalTokens +
      ichiTotalSupply -
      v1Balance -
      v2Balance -
      v3Balance -
      ichiInV2Balance -
      communityGnosisBalance -
      ichiV2GnosisBalance -
      ichiAllyBalance - 
      ichiGSRBalance;

      // console.log(circulating);
  }

  console.log(tokenName);
  /*  if (parentOneToken && parentOneToken != "") {
    price = await lookUpMemberTokenPrice(TOKENS[parentOneToken]['address'], address, decimals);
  } else if (isOneToken) {*/
  if (token.isOneToken) {
    price = 1;
    if (tokenName == 'onebtc' || tokenName == 'oneuni') {
      // special case - get price from oneToken/ICHI vault's pool
      const ichiV2Token = getToken(TokenName.ICHI_V2, chainId);
      let tokenPrices = await lookUpTokenPrices([ichiV2Token.address.toLowerCase()]);
      let ichiPrice = tokenPrices[ichiV2Token.address.toLowerCase()].usd;
      price = await getOneTokenPriceFromVault(tokenName, ichiPrice, provider, chainId);
    }
  } else {
    switch (tokenName) {
      case TokenName.USDC:
      case TokenName.DAI:
        price = 1;
        break;
      case TokenName.XICHI:
        price = await getXICHIPrice(chainId);
        break;
      case TokenName.VBTC:
        price = await getVBTCPrice(chainId);
        break;
      case TokenName.PWING:
        // price = await getMemberTokenPrice(TOKENS['onewing']['address'], TOKENS['pwing']['address'], 9);
        price = await getMemberTokenPrice(TokenName.ONE_WING, TokenName.PWING, { chainId, provider, decimals: 9 });
        break;
      case TokenName.BOOT:
        price = await getMemberTokenPrice(TokenName.BOOT_USD, TokenName.BOOT, { chainId, provider, decimals: 9 });
        break;
      case TokenName.WETH:
        price = await getStimulusUSDPrice(TokenName.ONE_ETH, { chainId, provider, decimals: 9 });
        break;
      case TokenName.WBTC:
        price = await getMemberTokenPrice(TokenName.ONE_BTC, TokenName.WBTC, { chainId, provider, decimals: 8 });
        break;
      case TokenName.LINK:
        price = await getStimulusOraclePrice(TokenName.ONE_LINK, { chainId, provider, decimals: 9 });
        break;
      case TokenName.ICHI:
        const ichiV2Token = getToken(TokenName.ICHI_V2, chainId);
        let lookup_price1 = await lookUpTokenPrices([ichiV2Token.address.toLowerCase()]);
        price = lookup_price1[ichiV2Token.address.toLowerCase()].usd;
        priceChange = lookup_price1[ichiV2Token.address.toLowerCase()].usd_24h_change;
        break;
      default:
        let lookup_price = await lookUpTokenPrices([token.address.toLowerCase()]);
        price = lookup_price[token.address.toLowerCase()].usd;
        priceChange = lookup_price[token.address.toLowerCase()].usd_24h_change;
    }
  }

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
      'tokenName = :tokenName,' +
      'circulating = :circulating, ' +
      'address = :address, ' +
      'decimals = :decimals, ' +
      'displayName = :displayName, ' +
      'price = :price, ' +
      'price_24h_change = :price_24h_change, ' +
      'chainId = :chainId, ' +
      'isOneToken = :isOneToken, ' +
      'supply = :supply',
    ExpressionAttributeValues: {
      ':tokenName': { S: token.tokenName },
      ':circulating': { N: circulating.toString() },
      ':address': { S: token.address },
      ':decimals': { N: token.decimals.toString() },
      ':displayName': { S: token.displayName },
      ':price': { N: Number(price).toString() },
      ':price_24h_change': { N: Number(priceChange).toString() },
      ':chainId': { N: Number(chainId).toString() },
      ':isOneToken': { BOOL: token.isOneToken },
      ':supply': { N: totalTokens.toString() }
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
