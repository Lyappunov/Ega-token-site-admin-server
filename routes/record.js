const express = require("express");

// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const recordRoutes = express.Router();

// This will help us connect to the database
const dbo = require("../db/conn");

// This help convert the id from string to ObjectId for the _id.
const ObjectId = require("mongodb").ObjectId;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const Telegram = require('telegram-notify') ;
const asyncHandler = require('express-async-handler');
const validateLoginInput = require('../validation/login');
const validateRegisterInput = require('../validation/register');
const keys = require('../config/keys');
const Price = require( '../utils/Price').Price;
const Bitquery = require( '../utils/bitquery').Bitquery;

var priceClss = new Price();
var bitquery = new Bitquery();
var egaPrice = 0;

function generalDateRange(){
  var range=[]
  var today = new Date();
  var thisyear = today.getFullYear();
  var lastyear = thisyear
  var beforeDay = parseInt(today.getDate()) - 10;
  var thisMonth = today.getMonth()<10?'0'+(today.getMonth() + 1):(today.getMonth() + 1)
  var lastMonth = thisMonth
  if(beforeDay<=0)
   lastMonth = today.getMonth()<10?'0'+(today.getMonth()):(today.getMonth())
  if(thisMonth == '01'){
    lastMonth = '12'
    lastyear = thisyear - 1
  }
  
  var thisDay = today.getDate()<10?'0'+(today.getDate()):today.getDate();
  var lastDay = (beforeDay<10)?'0'+beforeDay:beforeDay
  if(beforeDay<=0)lastDay = 30 + beforeDay
  var thisMonthToday = thisyear+'-'+thisMonth+'-'+thisDay
  var lastMonthToday = lastyear+'-'+lastMonth+'-'+lastDay
  var Hours = today.getHours()<10?'0'+today.getHours():today.getHours()
  var Minutes = today.getMinutes()<10?'0'+today.getMinutes():today.getMinutes()
  var Seconds = today.getSeconds()<10?'0'+today.getSeconds():today.getSeconds();
  var time = Hours+ ":" + Minutes + ":" + Seconds
  var fromDateTime = lastMonthToday + 'T' + time + 'Z'
  var toDateTime = thisMonthToday + 'T' + time + 'Z'
  range.push(fromDateTime)
  range.push(toDateTime)
  return range
}

const dateRangeGlobal = generalDateRange()

// This section will help you get a list of all the records.
recordRoutes.route("/record").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("records")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});


// This section will help you get a single record by id
recordRoutes.route("/record/:id").get(function (req, res) {
  let db_connect = dbo.getDb();
  let myquery = { _id: ObjectId( req.params.id )};
  db_connect
      .collection("records")
      .findOne(myquery, function (err, result) {
        if (err) throw err;
        res.json(result);
      });
});

// This section will help you create a new record.
recordRoutes.route("/record/add").post(function (req, response) {
  let db_connect = dbo.getDb();
  let myobj = {
    person_name: req.body.person_name,
    person_position: req.body.person_position,
    person_level: req.body.person_level,
  };
  db_connect.collection("records").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
  });
});

// This section will help you update a record by id.
recordRoutes.route("/update/:id").post(function (req, response) {
  let db_connect = dbo.getDb();
  let myquery = { _id: ObjectId( req.params.id )};
  let newvalues = {
    $set: {
      name: req.body.name,
      phonenumber: req.body.phonenumber
    },
  };
  db_connect
    .collection("records")
    .updateOne(myquery, newvalues, function (err, res) {
      if (err) throw err;
      console.log("1 document updated");
      response.json(res);
    });
});

// This section will help you delete a record
recordRoutes.route("/:id").delete((req, response) => {
  let db_connect = dbo.getDb();
  let myquery = { _id: ObjectId( req.params.id )};
  db_connect.collection("records").deleteOne(myquery, function (err, obj) {
    if (err) throw err;
    console.log("1 document deleted");
    response.status(obj);
  });
});

recordRoutes.route("/record/login").post(function (req, res) {
    const { errors, isValid } = validateLoginInput(req.body);
    if (!isValid) {
        return res.status(400).json(errors);
    }
    const phonenumber = req.body.phonenumber;
    const password = req.body.password;
    let db_connect = dbo.getDb();
    let myquery = {   
        phonenumber: phonenumber 
    };
    db_connect
      .collection("records")
      .findOne(myquery, function (err, user) {
            if (err) throw err;
            if (!user) {
                return res.status(404).json({ phonenumber: 'Phone Number not found' });
            }
            bcrypt.compare(password, user.password).then(isMatch => {
                if (isMatch) {
                    const payload = {
                        id: user._id,
                        name: user.name
                    };
                    jwt.sign(
                        payload,
                        keys.secretOrKey,
                        {
                            expiresIn: 31556926 // 1 year in seconds
                        },
                        (err, token) => {
                            res.json({
                                success: true,
                                token: 'Bearer ' + token
                            });
                        }
                    );
                } else {
                    return res
                        .status(400)
                        .json({ password: 'Password incorrect' });
                }
            });
      })
      
  });

  recordRoutes.route("/record/register").post(function (req, res) {
    console.log('>>>>>>>>>>>>>>>>>', req.body)

    var d = new Date(),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;
    var current_date = [year, month, day].join('-');


    const { errors, isValid } = validateRegisterInput(req.body);
    if (!isValid) {
        return res.status(400).json(errors);
    }

    let db_connect = dbo.getDb();
    let myquery = {   
        phonenumber: req.body.phonenumber 
    };
    db_connect
      .collection("records")
      .findOne(myquery, function (err, user) {
            if (err) throw err;
            if (user) {
                return res.status(404).json({ phonenumber: 'This phone number already exists' });
            }
            else {
                
                let newUser = {
                    name: req.body.name,
                    phonenumber: req.body.phonenumber,
                    password: req.body.password,
                    date:current_date
                  };
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        newUser.password = hash;
                        // newUser
                        //     .save()
                        //     .then(user => {
                        //         return res.status(200).json({message: 'User added successfully. Refreshing data...'})
                        //     }).catch(err => console.log(err));
                        db_connect.collection("records").insertOne(newUser, function (err, use) {
                            if (err) throw err;
                            return res.status(200).json({message: 'User added successfully. Refreshing data...'})
                          });
                    });
                });
            }
      })
      
  });

  recordRoutes.route("/record/tokenAdd").post(function (req, response) {
    console.log('the request body for add new token is ', req.body)
    let db_connect = dbo.getDb();
    let myobj = {
      tokenname: req.body.tokenname,
      tokensymbol: req.body.tokensymbol,
      tokentype: req.body.tokentype,
      tokenaddress: req.body.tokenaddress,
      totalsupply: req.body.totalsupply,
    };
    db_connect.collection("tokens").insertOne(myobj, function (err, res) {
      if (err) throw err;
      response.json(res);
    });
  });

  recordRoutes.route("/tokens").get(function (req, res) {
    let db_connect = dbo.getDb();
    db_connect
      .collection("tokens")
      .find({})
      .toArray(function (err, result) {
        if (err) throw err;
        res.json(result);
      });
  });

  recordRoutes.route("/tokens/:id").get(function (req, res) {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId( req.params.id )};
    db_connect
        .collection("tokens")
        .findOne(myquery, function (err, result) {
          if (err) throw err;
          res.json(result);
        });
  });
  
  recordRoutes.route("/tokenupdate/:id").post(function (req, response) {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId( req.params.id )};
    let newvalues = {
      $set: {
        tokenname: req.body.tokenname,
        tokensymbol: req.body.tokensymbol,
        tokentype: req.body.tokentype,
        tokenaddress: req.body.tokenaddress,
        totalsupply: req.body.totalsupply,
      },
    };
    db_connect
      .collection("tokens")
      .updateOne(myquery, newvalues, function (err, res) {
        if (err) throw err;
        console.log("token updated");
        response.json(res);
      });
  });
  recordRoutes.route("/tokendelete/:id").delete((req, response) => {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId( req.params.id )};
    db_connect.collection("tokens").deleteOne(myquery, function (err, obj) {
      if (err) throw err;
      console.log("token deleted");
      response.status(obj);
    });
  });

  recordRoutes.route("/record/tranadd").post(function (req, response) {
    let db_connect = dbo.getDb();
    let myobj = {
      personName: req.body.personName,
      walletAddress: req.body.walletAddress,
      tranDate: req.body.tranDate,
      tokenName: req.body.tokenName,
      tranType: req.body.tranType,
      amount : req.body.amount
    };
    db_connect.collection("transactions").insertOne(myobj, function (err, res) {
      if (err) throw err;
      response.json(res);
    });
  });

  recordRoutes.route("/record/swapping").post(function (req, response) {
    let dateRange = generalDateRange()
    let db_connect = dbo.getDb();
    let myobj = {
      name: req.body.name,
      walletAddress: req.body.walletAddress,
      fromToken: req.body.fromToken,
      toToken: req.body.toToken,
      fromAmount: req.body.fromAmount,
      toAmount : req.body.toAmount,
      swapDate : dateRange[1]
    };
    db_connect.collection("swapping").insertOne(myobj, function (err, res) {
      if (err) throw err;
      response.json(res);
    });
  });

  recordRoutes.route("/record/exchange").post(function (req, response) {
    let dateRange = generalDateRange()
    let db_connect = dbo.getDb();
    let myobj = {
      name: req.body.name,
      walletAddress: req.body.walletAddress,
      fromToken: req.body.fromToken,
      toToken: req.body.toToken,
      fromAmount: req.body.fromAmount,
      toAmount : req.body.toAmount,
      swapDate : dateRange[1]
    };
    db_connect.collection("exchange").insertOne(myobj, function (err, res) {
      if (err) throw err;
      response.json(res);
    });
  });

  recordRoutes.route("/record/salesubscribe").post(function (req, response) {
    console.log('the request body for saving new subscribing is ', req.body)
    let dateRange = generalDateRange()
    let db_connect = dbo.getDb();
    let myobj = {
      subscriber: req.body.subscriber,
      walletAddress: req.body.walletAddress,
      subscribeDate: dateRange[1],
      tokenName: req.body.tokenName,
      amount: req.body.amount,
      paymentKind : req.body.paymentKind,
      usdPrice : req.body.usdPrice,
      eurPrice : req.body.eurPrice,
      address : req.body.address,
      paymentState:req.body.paymentState
    };
    db_connect.collection("saleSubscribe").insertOne(myobj, function (err, res) {
      if (err) throw err;
      response.json(res);
    });
  });

  recordRoutes.route("/subscribe").get(function (req, res) {
    let db_connect = dbo.getDb();
    db_connect
      .collection("saleSubscribe")
      .find({paymentState:'pending'})
      .toArray(function (err, result) {
        if (err) throw err;
        res.json(result);
      });
  });

  recordRoutes.route("/subscribeupdate/:id").post(function (req, response) {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId( req.params.id )};
    let newvalues = {
      $set: {
        paymentState : 'paid'
      },
    };
    db_connect
      .collection("saleSubscribe")
      .updateOne(myquery, newvalues, function (err, res) {
        if (err) throw err;
        console.log("subscribe paid");
        response.json(res);
      });
  });

  recordRoutes.route("/transaction").get(function (req, res) {
    let db_connect = dbo.getDb();
    db_connect
      .collection("transactions")
      .find({})
      .toArray(function (err, result) {
        if (err) throw err;
        res.json(result);
      });
  });

  recordRoutes.route("/tokenprice").get(function (req, res) {
    let db_connect = dbo.getDb();
    // let myquery = { _id: ObjectId( req.params.id )};
    db_connect
        .collection("tokenprice")
        .find({})
        .toArray(function (err, result) {
          if (err) throw err;
          res.json(result);
        });
  });
  
  recordRoutes.route("/tokenpriceupdate/:id").post(function (req, response) {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId( req.params.id )};
    let newvalues = {
      $set: {
        ega: req.body.ega,
        mos: req.body.mos
      },
    };
    db_connect
      .collection("tokenprice")
      .updateOne(myquery, newvalues, function (err, res) {
        if (err) throw err;
        console.log("token updated");
        response.json(res);
      });
  });

  recordRoutes.route("/limitamount").get(function (req, res) {
    let db_connect = dbo.getDb();
    // let myquery = { _id: ObjectId( req.params.id )};
    db_connect
        .collection("limitedamount")
        .find({})
        .toArray(function (err, result) {
          if (err) throw err;
          res.json(result);
        });
  });
  
  recordRoutes.route("/limitamountupdate/:id").post(function (req, response) {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId( req.params.id )};
    let newvalues = {
      $set: {
        saleMAX: req.body.saleMAX,
        buyMIN: req.body.buyMIN
      },
    };
    db_connect
      .collection("limitedamount")
      .updateOne(myquery, newvalues, function (err, res) {
        if (err) throw err;
        console.log("limit amount updated");
        response.json(res);
      });
  });

  recordRoutes.route("/apikey").get(function (req, res) {
    let db_connect = dbo.getDb();
    // let myquery = { _id: ObjectId( req.params.id )};
    db_connect
        .collection("apikey")
        .find({})
        .toArray(function (err, result) {
          if (err) throw err;
          res.json(result);
        });
  });
  
  recordRoutes.route("/apikeyupdate/:id").post(function (req, response) {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId( req.params.id )};
    let newvalues = {
      $set: {
        bscscan: req.body.bscscan
      },
    };
    db_connect
      .collection("apikey")
      .updateOne(myquery, newvalues, function (err, res) {
        if (err) throw err;
        console.log("apikey updated");
        response.json(res);
      });
  });

  recordRoutes.route("/egaprice").get(asyncHandler(async function (req, response) {
    https.get('https://api.coingecko.com/api/v3/coins/bitcoin', (resp) => {
      let data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
          let btc_usd = JSON.parse(data).market_data.current_price.usd;
          priceClss.getPrice().then(bal =>{
            bitquery.loadBitqueryDataBTCbalance().then(btc=>{
              let btcBalance = btc.data.bitcoin.outputs[0].value;
              let ega_price_cal = (( (btcBalance*0.775) / Number(bal.egaBalance))*1000000) * Number(btc_usd);
              response.json(ega_price_cal.toFixed(11));  
            })
          });
        })
    })
  }))

  recordRoutes.route("/egabalance").get(asyncHandler(async function (req, response) {

    priceClss.getBalanceInWallet().then(bal =>{
        
        response.json(bal);  
    });
  
  }))

  recordRoutes.route("/totalsupply").get(asyncHandler(async function (req, response) {

    priceClss.getTotalSupply().then(bal =>{
        
        response.json(bal);  
    });
  
  }))

  recordRoutes.route("/pairprice").post(asyncHandler(async function (req, response) {
    https.get('https://api.coingecko.com/api/v3/coins/bitcoin', (resp) => {
      let data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
          let btc_bnb = JSON.parse(data).market_data.current_price.bnb;
          let btc_usd = JSON.parse(data).market_data.current_price.usd;
          let btc_eur = JSON.parse(data).market_data.current_price.eur;
          let bnb_usd = Number(btc_usd)/Number(btc_bnb);

          const totalSupply = 1000000000;
          let db_connectinfo = dbo.getDb();
          db_connectinfo
            .collection("transactions")
            .find({})
            .toArray(function (err, result) {
              if (err) throw err;
              let total_buy = 0;
              result.forEach(trans => {
                if(trans.tranType == "BUY")
                total_buy = total_buy + Number(trans.amount)
                if(trans.tranType == "SELL")
                total_buy = total_buy - Number(trans.amount)
              });
              let gah = {
                distributes : total_buy,
                balance : totalSupply - total_buy,
                totalSupply : totalSupply
              };
            
            bitquery.loadBitqueryDataBTCbalance().then(btc=>{
              let btcBalance = btc.data.bitcoin.outputs[0].value;
              // let ega_price_cal = (( (btcBalance*0.775) / Number(bal.egaBalance))*1000000) * Number(btc_usd);
              let ega_price_cal = (( (btcBalance*0.775) / (gah.balance *1000))) * Number(btc_usd);
              
              let db_connect = dbo.getDb();
              db_connect
                  .collection("tokenprice")
                  .find({})
                  .toArray(function (err, result) {
                    if (err) throw err;
                    console.log('calculated ega price is ', result)
                    let ega_price = ega_price_cal + Number(result[0].ega);
                    let ega_bnb = ega_price/bnb_usd;
                    let ega_btc = ega_price/Number(btc_usd);
                    let ega_eur = ega_btc * Number(btc_eur);
                    let ega_mos = ega_eur/result[0].mos;
                    const pair_price = {
                      ega_usd : ega_price.toFixed(12),
                      ega_btc : ega_btc.toFixed(12),
                      ega_bnb : ega_bnb.toFixed(12),
                      ega_eur : ega_eur.toFixed(12),
                      ega_mos : ega_mos.toFixed(12),
                      date : dateRangeGlobal[1]
                    }
                    console.log(pair_price);
                    // response.json(pair_price);
                    db_connect.collection("pairprice").insertOne(pair_price, function (err, res) {
                      if (err) throw err;
                      response.json(res);
                    });
                  });
              
            })
          });
        });
    });
  }))

  recordRoutes.route("/currentpairprice/:limit").get(function (req, res) {
    let db_connect = dbo.getDb();
    db_connect
        .collection("pairprice")
        .find({})
        .sort({_id:-1}).limit(parseInt(req.params.limit))
        .toArray(function (err, result) {
          if (err) throw err;
          res.json(result);
        })
  });

  recordRoutes.route("/telegram").post(asyncHandler(async function (req, responseresult) {
    https.get('https://api.coingecko.com/api/v3/coins/bitcoin', (resp) => {
      let data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
          let btc_usd = JSON.parse(data).market_data.current_price.usd;

          const totalSupply = 1000000000;
          let db_connectinfo = dbo.getDb();
          db_connectinfo
            .collection("transactions")
            .find({})
            .toArray(function (err, result) {
              if (err) throw err;
              let total_buy = 0;
              result.forEach(trans => {
                if(trans.tranType == "BUY")
                total_buy = total_buy + Number(trans.amount)
                if(trans.tranType == "SELL")
                total_buy = total_buy - Number(trans.amount)
              });
              let gah = {
                distributes : total_buy,
                balance : totalSupply - total_buy,
                totalSupply : totalSupply
              };
          
            bitquery.loadBitqueryDataBTCbalance().then(btc=>{
              let btcBalance = btc.data.bitcoin.outputs[0].value;
              // let ega_price_cal = (( (btcBalance*0.775) / Number(bal.egaBalance))*1000000) * Number(btc_usd);
              let ega_price_cal = (( (btcBalance*0.775) / (gah.balance *1000))) * Number(btc_usd);
              var price = ega_price_cal.toFixed(11)
              let db_connect = dbo.getDb();
              db_connect
              .collection("tokenprice")
              .find({})
              .toArray(function (err, result) {
                if (err) throw err;
                var displayPrice = Number(price) + Number(result[0].ega)
                
                let notify = new Telegram({token:keys.botToken, chatId:keys.chatId})
                var message = 'The current price of EGA token is ' + displayPrice + ' USD'
                // responseresult.json(message)
                const fetchOption = {}
                const apiOption = {
                    disable_web_page_preview:false,
                    disable_notification:false
                }
                notify.send(message,fetchOption, apiOption).then(response => {
                    responseresult.send(response);
                });

              });
            })
          });
        })
    })  
  }))

  recordRoutes.route("/getinfo").get(function (req, res) {
    const totalSupply = 1000000000;
  
    let db_connect = dbo.getDb();
      // let myquery = { _id: ObjectId( req.params.id )};
      db_connect
          .collection("transactions")
          .find({})
          .toArray(function (err, result) {
            if (err) throw err;
            let total_buy = 0;
            result.forEach(trans => {
              if(trans.tranType == "BUY")
              total_buy = total_buy + Number(trans.amount)
              if(trans.tranType == "SELL")
              total_buy = total_buy - Number(trans.amount)
            });
            let gah = {
              distributes : total_buy,
              balance : totalSupply - total_buy,
              totalSupply : totalSupply
            };
            res.json( gah );
          });
    
  });

module.exports = recordRoutes;