# ICHI Price Oracle  Monitoring

## 1 - ICHI Oracle Aggregator 

This [contract](https://github.com/ichifarm/util-contracts/blob/94a50c0d5d09a2d6b092cc309976634ffaa409bd/contracts/oracles/ICHIOracleAggregator.sol)   is used to handle the oracles being used by the ICHI DeFi System. It uses the following functions - 

- setOracles()
- ICHIPrice()
- xICHIPrice()
- normalizedToTokens()

Importantly, `ICHIPrice()` can accept upto 3 total oracles. They return a price for the ICHI tokens if the deviation between the price feeds from the input oracles is less than a threshold. 

As of now, we are using the following oracles - 

- ICHI/USD - [Uniswap](https://etherscan.io/address/0x1f8340Aef6B33d12C89e901DDe312467c2F146E2)
- ICHI/USD - [Bancor](https://etherscan.io/address/0xE0191c950B2c19D7A470B00c59969c17fCD9a150)

## Additional Sources - 

We could use a set of off-chain price sources for the ICHI token such as

- Coin Gecko (https://www.coingecko.com/en/coins/ichi)
- Coin Base (https://www.coinbase.com/price/ichi)
- Kraken (https://www.kraken.com/en-us)

We could use their API to get 3rd party price feed on the ICHI oracle 

## Architecture - 

We can set up an AWS Lambda function along with a configured custom web hook. 

The AWS function would call `ICHIPrice` (a free read-only function) every 30 minutes. It would also simultaneously get the prices from the above mentioned additional sources. 

For greater redundancy, we can aggregate all this data into a datadog monitor, which allows us to visualise data feeds from oracle systems effectively. 

Finally, we could set up a discord alert within the Lambda to notify the `DMA Devs` channel when the price difference between the contract's values and the 3rd party values is more than a threshold.

