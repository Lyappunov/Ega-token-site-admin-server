const axios = require('axios');
// import fetch from 'node-fetch';
class Bitquery {
  
  async loadBitqueryDataUSDT(startTime) {

        const query = `
        {
            ethereum(network: bsc) {
              dexTrades(
                options: {desc: "block.timestamp.time", limit: 1}
                exchangeAddress: {in:["0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"]}
                quoteCurrency: {in: ["0x55d398326f99059ff775485246999027b3197955"]}
                time: {since: "${startTime}"}
                baseCurrency: {in: ["0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c"]}
              ) {
                exchange {
                  name
                }
                block {
                  timestamp {
                    time(format: "%Y-%m-%d %H")
                  }
                }
                timeInterval {
                    minute(count: 60)
                  }
                baseCurrency {
                  address
                  symbol
                }
                quoteCurrency {
                  address
                  symbol
                }
                USD: tradeAmount(in: USD)
                Txs: count
                quotePrice
              }
            }
          }`;

        const res = await axios({
            method: 'POST',
            url:'https://graphql.bitquery.io',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'X-API-KEY': 'BQYvhnv04csZHaprIBZNwtpRiDIwEIW9',
            },
            data: JSON.stringify({ query }),
            mode: 'cors',
        });
        return await res.data;

        function toISODateTime(t) {
            return new Date(t).toISOString();
        }

        function toISODate(t) {
            return toISODateTime(t).split('T')[0];
        }
    }

    async loadBitqueryDataBTCbalance() {
    //    
        const query = `
        {
            bitcoin {
                inputs(
                  inputAddress: {is: "18cBEMRxXHqzWWCxZNtU91F5sbUNKhL5PX"}) {
                  value
                }
                outputs( outputAddress: {is: "18cBEMRxXHqzWWCxZNtU91F5sbUNKhL5PX"}) {
                  value
                }
              }
          }`;

        const res = await axios({
            method: 'POST',
            url:'https://graphql.bitquery.io', 
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'X-API-KEY': 'BQYvhnv04csZHaprIBZNwtpRiDIwEIW9',
            },
            data: JSON.stringify({ query }),
            mode: 'cors',
        });
        return await res.data;
    }


}

exports.Bitquery = Bitquery