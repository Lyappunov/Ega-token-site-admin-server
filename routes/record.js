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

const bitcore = require("bitcore-lib");
const axios = require("axios");
const multer = require('multer');

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
  var thisMonth = today.getMonth()<9?'0'+(today.getMonth() + 1):(today.getMonth() + 1)
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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'avatars')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' +file.originalname)
  }
})
const upload = multer({ storage: storage }).single('file')

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

recordRoutes.route("/admins").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("records")
    .find({isAdmin : true})
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
  console.log(req.body.photoName)
  let db_connect = dbo.getDb();
  let myquery = { _id: ObjectId( req.params.id )};
  let newvalues = {
    $set: {
      name: req.body.name,
      phonenumber: req.body.phonenumber,
      photoName:req.body.photoName,
      isAdmin : req.body.isAdmin,
      birthday : req.body.birthday,
      nickname : req.body.nickname
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
recordRoutes.route("/adminauth/:id").get(function (req, res) {
  let db_connect = dbo.getDb();
  let myquery = { userID:  req.params.id };
  db_connect
      .collection("adminauth")
      .findOne(myquery, function (err, result) {
        if (err) throw err;
        res.json(result);
      });
});

recordRoutes.route("/updateadminauth/:id").post(function (req, response) {

  let db_connect = dbo.getDb();
  
  let myquery = { userID: req.params.id };
  db_connect.collection('adminauth').findOne(myquery, function(err, result){
    if(err) throw err;
    console.log(result)
    if(result != null){
      let updatevalues = {
        $set: {
          name: req.body.name,
          userID:req.body.userID,
          userEdit : req.body.userEdit,
          tokenEdit : req.body.tokenEdit,
          payForSale : req.body.payForSale,
          sendToken : req.body.sendToken,
          settingEdit : req.body.settingEdit,
          tokenSale : req.body.tokenSale,
        },
      };
      db_connect
        .collection("adminauth")
        .updateOne(myquery, updatevalues, function (err, res) {
          if (err) throw err;
          response.json(res);
        });
    }
    else {
      let newvalues = {
          name: req.body.name,
          userID:req.body.userID,
          userEdit : req.body.userEdit,
          tokenEdit : req.body.tokenEdit,
          payForSale : req.body.payForSale,
          sendToken : req.body.sendToken,
          settingEdit : req.body.settingEdit,
          tokenSale : req.body.tokenSale,
        };
      db_connect
        .collection("adminauth").insertOne(newvalues, function (err, res) {
          if (err) throw err;
          response.json(res);
        });
    }
  })
  
});
recordRoutes.route("/uploadphoto").post(function (req, res) {
  upload(req, res, (err) => {
    if (err) {
      // res.sendStatus(500);
      res.send(err);
    }
    res.send(req.file);
  });
});

// This section will help you delete a record
recordRoutes.route("/userdelete/:id").delete((req, response) => {
  let db_connect = dbo.getDb();
  let myquery = { _id: ObjectId( req.params.id )};
  db_connect.collection("records").deleteOne(myquery, function (err, obj) {
    if (err) response.send(err);
    console.log("1 document deleted");
    response.send('successful!');
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
                        name: user.name,
                        avatar : user.photoName,
                        phoneNumber : user.phonenumber,
                        adminType : user.adminType?user.adminType:'',
                        isAdmin : user.isAdmin?user.isAdmin:false
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
                    date:current_date,
                    birthday:req.body.birthday,
                    nickname : req.body.nickname
                  };
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        newUser.password = hash;
                        db_connect.collection("records").insertOne(newUser, function (err, use) {
                            if (err) throw err;
                            return res.status(200).json({message: 'User added successfully. Refreshing data...'})
                          });
                    });
                });
            }
      })
      
  });

  recordRoutes.route("/record/verify").post(function (req, res) {
    console.log(req.body);
    const birthday = req.body.birthday;
    const nickname = req.body.nickname;
    const phonenumber = req.body.phonenumber;
    let db_connect = dbo.getDb();
    let myquery = {   
        phonenumber: phonenumber,
        nickname: nickname,
    };
    db_connect
      .collection("records")
      .findOne(myquery, function (err, user) {
            if (err) throw err;
            console.log(user);
            if (user == null) {
                return res.json({ resuc: 'failure', data : {} });
            } else {
              return res.json({
                resuc : 'success',
                data : {
                  id:user._id
                }
              })
            }
            
      })
      
  });

  recordRoutes.route("/record/resetpassword").post(function (req, res) {
    console.log(req.body.userID)
    let db_connect = dbo.getDb();
    let myquery = {   
        _id: ObjectId( req.body.userID )
    };
    if(req.body.password != req.body.password2){
      return res.status(404).json({ message: 'your password is not matched with confirm password.' });
    }
    else {
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(req.body.password, salt, (error, hash) => {
            if (error) throw error;
            
            let newvalues = {
              $set: {
                password : hash
              },
            };
            db_connect.collection("records")
              .updateOne(myquery, newvalues, function (e, r) {
                if (e) throw e;
                return res.status(200).json({message: 'Your password has been successfully reset.'})
              });
        });
      });
    }    
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

  recordRoutes.route("/record/sendtoken").post(function (req, response) {
    console.log('the request body to add sending info is ', req.body)
    let db_connect = dbo.getDb();
    let myobj = {
      name: req.body.name,
      walletaddress: req.body.walletaddress,
      tokenName: req.body.tokenName,
      sendingDate: req.body.sendingDate,
      amount: req.body.amount,
    };
    db_connect.collection("adminsend").insertOne(myobj, function (err, res) {
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
    let toWalletAddress = '';
    if(req.body.toWalletAddress) toWalletAddress = req.body.toWalletAddress;
    let myobj = {
      personName: req.body.personName,
      walletAddress: req.body.walletAddress,
      toWalletAddress: toWalletAddress,
      tranDate: req.body.tranDate,
      tokenName: req.body.tokenName,
      tranType: req.body.tranType,
      amount : req.body.amount,
      price : req.body.price,
    };
    db_connect.collection("transactions").insertOne(myobj, function (err, res) {
      if (err) throw err;
      console.log('your trans add is successful.')
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
      if (err) return response.json(err);
      else return response.json(res);
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
      exchangeDate : dateRange[1]
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
      btcPrice : req.body.btcPrice,
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

  recordRoutes.route("/reservation/:id").post(function (req, response) {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId( req.body.subscriberID )};
    let reservequery = {_id: ObjectId( req.params.id )}
    db_connect
      .collection("records")
      .findOne(myquery, function (e, result) {
        if (e) throw e;
        
        let newvalues = {
          $set: {
            paymentState : 'reserved'
          },
        };
        db_connect
          .collection("saleSubscribe")
          .updateOne(reservequery, newvalues, function (err, res) {
            if (err) throw err;
            console.log(result);
            response.json(result);
          });
      });
  });

  recordRoutes.route("/transaction_origin").get(function (req, res) {
    let db_connect = dbo.getDb();
    db_connect
      .collection("transactions")
      .find({})
      .toArray(function (err, result) {
        if (err) throw err;
        res.json(result);
      });
  });
  recordRoutes.route("/transaction").get(function (req, res) {
    let history_arr = [];
      
      let db_connect = dbo.getDb();
      db_connect
      .collection("transactions")
      .find({})
      .toArray(function (err, result) {
        if (err) throw err;
        history_arr.push(result);
        db_connect
        .collection("swapping")
        .find({})
        .toArray(function (er, re) {
          if (er) throw er;
          history_arr.push(re);
          db_connect.collection("adminsend").find({})
          .toArray(function (error, adres){
            if(error) throw error;
            history_arr.push(adres);
            console.log(history_arr);
            res.json(history_arr);
          })
        });
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

  recordRoutes.route("/egaprice_origin").get(asyncHandler(async function (req, response) {
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

  recordRoutes.route("/egaprice").get(asyncHandler(function (req, response) {
    https.get('https://api.coingecko.com/api/v3/coins/bitcoin', (resp) => {
      let data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
          let parsedData = JSON.parse(data);
          let btc_usd = parsedData.market_data.current_price.usd;
          let totalSupply = 1000000000;
          let total_buy = 0;
          let db_connectinfo = dbo.getDb();
          db_connectinfo.collection("adminsend").find({})
          .toArray(function (e, r) {
            if (e) throw e;
            r.forEach(item => {
              if(item.tokenName == 'gah')
              total_buy = total_buy + Number(item.amount);
            });
            db_connectinfo
            .collection("swapping")
            .find({})
            .toArray(function (err, result) {
              if (err) throw err;
              
              result.forEach(trans => {
                if(trans.toToken =='gah')
                total_buy = total_buy + Number(trans.toAmount);
                if(trans.fromToken == 'gah')
                total_buy = total_buy - Number(trans.fromAmount);
              });
              let gah = {
                distributes : total_buy,
                balance : totalSupply - total_buy,
                totalSupply : totalSupply
              };
              bitquery.loadBitqueryDataBTCbalance().then(btc=>{
                let btcBalance = btc.data.bitcoin.outputs[0].value;
                let ega_price_cal = (( (btcBalance*0.775) / (gah.balance *1000))) * Number(btc_usd);
                 

                db_connectinfo
                .collection("tokenprice")
                .find({})
                .toArray(function (err, res) {
                  if (err) throw err;
                  let mosPrice = res[0].mos;
                  let prices = {
                    egaPrice : ega_price_cal.toFixed(11),
                    mosPrice : mosPrice
                  }
                  response.json(prices); 
                })
              })
            });
          });
          
        })
    })
  }))


  recordRoutes.route("/egabalance").get(asyncHandler(async function (req, response) {

    let totalSupply = 1000000000;
    let total_buy = 0;
    let db_connectinfo = dbo.getDb();
    db_connectinfo.collection("adminsend").find({})
    .toArray(function (er, re){
      if (er) throw er;
      re.forEach(item => {
        if(item.tokenName == 'gah')
        total_buy = total_buy + Number(item.amount);
      });
      db_connectinfo
      .collection("swapping")
      .find({})
      .toArray(function (err, result) {
        if (err) throw err;
        
        result.forEach(trans => {
          if(trans.toToken =='gah')
          total_buy = total_buy + Number(trans.toAmount);
          if(trans.fromToken == 'gah')
          total_buy = total_buy - Number(trans.fromAmount);
        });
        let gah = {
          distributes : total_buy,
          balance : totalSupply - total_buy,
          totalSupply : totalSupply
        };

        response.json((gah.balance).toFixed(5));  
        
      });
    });  
  }))

  recordRoutes.route("/totalsupply").get(asyncHandler(async function (req, response) {
    let db_connectinfo = dbo.getDb();
    db_connectinfo.collection("tokens").find({})
    .toArray(function (e, r) {
      if (e) throw e;
      let totalSupply = {
        gah: r[0].totalsupply,
        efranc : r[1].totalsupply
      }
      response.json(totalSupply);
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

          let totalSupply = 1000000000;
          let total_buy = 0;
          let db_connectinfo = dbo.getDb();
          db_connectinfo.collection("adminsend").find({})
          .toArray(function (e, r){
            if (e) throw e;
            r.forEach(item => {
              if(item.tokenName == 'gah')
              total_buy = total_buy + Number(item.amount);
            });
            db_connectinfo
              .collection("swapping")
              .find({})
              .toArray(function (err, result) {
                if (err) throw err;
                
                result.forEach(trans => {
                  if(trans.toToken =='gah')
                  total_buy = total_buy + Number(trans.toAmount);
                  if(trans.fromToken == 'gah')
                  total_buy = total_buy - Number(trans.fromAmount);
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
          let total_buy = 0;
          let db_connectinfo = dbo.getDb();
          db_connectinfo.collection("adminsend").find({})
          .toArray(function (e, r){
            if (e) throw e;
            r.forEach(item => {
              if(item.tokenName == 'gah')
              total_buy = total_buy + Number(item.amount);
            });
            db_connectinfo
              .collection("swapping")
              .find({})
              .toArray(function (err, result) {
                if (err) throw err;
                
                result.forEach(trans => {
                  if(trans.toToken == "gah")
                  total_buy = total_buy + Number(trans.toAmount)
                  if(trans.fromToken == "gah")
                  total_buy = total_buy - Number(trans.fromAmount)
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
                  var message = 'The current price of GAH token is ' + displayPrice + ' USD'
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
          });
          
        })
    })  
  }))

  recordRoutes.route("/getinfo").get(function (req, res) {
    const totalSupply = 1000000000;
    let total_buy = 0;
    let db_connect = dbo.getDb();
      // let myquery = { _id: ObjectId( req.params.id )};
    db_connect.collection("adminsend").find({})
    .toArray(function (e, r){
      if (e) throw e;
      r.forEach(item=>{
        if(item.tokenName == 'gah')
        total_buy = total_buy + Number(item.amount);
      });
      db_connect
      .collection("swapping")
      .find({})
      .toArray(function (err, result) {
        if (err) throw err;
        
        result.forEach(trans => {
          if(trans.toToken == "gah")
          total_buy = total_buy + Number(trans.toAmount)
          if(trans.fromToken == "gah")
          total_buy = total_buy - Number(trans.fromAmount)
        });
        let gah = {
          distributes : total_buy,
          balance : totalSupply - total_buy,
          totalSupply : totalSupply
        };
        res.json( gah );
      });
    })  
  });

  recordRoutes.route("/getwalletbalance/:walletAddress").get(function (req, response) {
    let total_buy_gah = 0;
    let total_buy_mos = 0;
    let db_connect = dbo.getDb();
    db_connect.collection("adminsend").find({walletaddress : req.params.walletAddress})
    .toArray(function (e,r){
      if (e) throw e;
      r.forEach(item => {
        if(item.tokenName == 'gah')
        total_buy_gah = total_buy_gah + Number(item.amount)
        if(item.tokenName == 'efranc')
        total_buy_mos = total_buy_mos + Number(item.amount)
      });
      
      db_connect
          .collection("swapping")
          .find({walletAddress : req.params.walletAddress})
          .toArray(function (err, result) {
            if (err) throw err;
            result.forEach(trans => {
              if(trans.toToken == "gah")
              total_buy_gah = total_buy_gah + Number(trans.toAmount)
              if(trans.fromToken == "gah")
              total_buy_gah = total_buy_gah - Number(trans.fromAmount)
              if(trans.toToken == "efranc")
              total_buy_mos = total_buy_mos + Number(trans.toAmount)
              if(trans.fromToken == "efranc")
              total_buy_mos = total_buy_mos - Number(trans.fromAmount)
            });
            db_connect.collection('transactions')
            .find({walletAddress : req.params.walletAddress})
            .toArray(function (er, res) {
                if(er) throw er;
                res.forEach(transaction => {
                  if(transaction.tranType == 'BUY')
                  total_buy_mos = total_buy_mos + Number(transaction.amount)
                  if(transaction.tranType == 'SELL')
                  total_buy_mos = total_buy_mos - Number(transaction.amount)
                  if(transaction.tranType == 'SEND')
                  total_buy_mos = total_buy_mos - Number(transaction.amount)
                })
                db_connect.collection('transactions')
                .find({toWalletAddress : req.params.walletAddress, tranType : 'SEND'})
                .toArray(function (errr, re) {
                  if(errr) throw errr;
                  re.forEach(transact => {
                    total_buy_mos = total_buy_mos + Number(transact.amount)
                  });
                  db_connect.collection('saleSubscribe').find({walletAddress : req.params.walletAddress})
                  .toArray(function(errors, results){
                    if(errors) throw errors;
                    console.log(req.params.walletAddress)
                    
                    results.forEach(subscribe => {
                      if(subscribe.paymentState == 'pending'){
                        total_buy_mos = total_buy_mos - Number(subscribe.amount);
                      }
                    })
                    let walletbalance = {
                      gah : total_buy_gah.toFixed(5),
                      mos : total_buy_mos.toFixed(5),
                    }
                    response.json( walletbalance );
                  }); 
                });    
            });
          });
    });
  });


  recordRoutes.route("/gettotalbalance").get(function (req, response) {
    let totalSupply = 1000000000;
    let total_buy_gah = 0;
    let total_buy_mos = 0;
    let db_connect = dbo.getDb();
    db_connect.collection("adminsend").find({})
    .toArray(function (e, r){
      if (e) throw e;
      r.forEach(item => {
        if(item.tokenName == 'gah')
        total_buy_gah = total_buy_gah + Number(item.amount);
        if(item.tokenName == 'efranc')
        total_buy_mos = total_buy_mos + Number(item.amount);
      });
      db_connect
      .collection("swapping")
      .find()
      .toArray(function (err, result) {
        if (err) throw err;
        
        result.forEach(trans => {
          if(trans.toToken == "gah")
          total_buy_gah = total_buy_gah + Number(trans.toAmount)
          if(trans.fromToken == "gah")
          total_buy_gah = total_buy_gah - Number(trans.fromAmount)
          if(trans.toToken == "efranc")
          total_buy_mos = total_buy_mos + Number(trans.toAmount)
          if(trans.fromToken == "efranc")
          total_buy_mos = total_buy_mos - Number(trans.fromAmount)
        });
        db_connect.collection('transactions')
        .find()
        .toArray(function (er, res) {
            if(er) throw er;
            res.forEach(transaction => {
              if(transaction.tranType == 'BUY')
              total_buy_mos = total_buy_mos + Number(transaction.amount)
              if(transaction.tranType == 'SELL')
              total_buy_mos = total_buy_mos - Number(transaction.amount)
            })

            db_connect.collection('saleSubscribe').find()
            .toArray(function(errors, results){
              if(errors) throw errors;
              results.forEach(subscribe => {
                if(subscribe.paymentState == 'pending')
                {
                  total_buy_mos = total_buy_mos - Number(subscribe.amount);
                }
              });
              let totalInfo = {
                gahTotalSupply : totalSupply,
                mosTotalSupply : totalSupply,
                gahDistributes : total_buy_gah,
                mosDistributes : total_buy_mos,
                gahBalance : totalSupply - total_buy_gah,
                mosBalance : totalSupply - total_buy_mos,
              }
              response.json( totalInfo );
            });
          });
        });
    });      
  });

    recordRoutes.route("/record/sendbitcoin").post(asyncHandler(async function (req, response) {
      console.log(req.body);
      let recipientAddress = req.body.recipientAddress;
      let senderAddress =  req.body.senderAddress;
      let senderPrivateKey = req.body.senderPrivateKey;
      let amountToSend = req.body.amountToSend;
      let db_connect = dbo.getDb();
      let saving_data = {
        recipientAddress:recipientAddress,
        senderAddress : senderAddress,
        senderPrivateKey : senderPrivateKey
      }
      
        let sochainNetwork = "BTC";
        // let sochainNetwork = "BTCTEST";
        
        let satoshiToSend = amountToSend * 100000000;
        let fee = 0;
        let inputCount = 0;
        let outputCount = 2;

        const transaction = new bitcore.Transaction();
        let totalAmountAvailable = 0;
        let inputs = [];

        let urlurl =  `https://sochain.com/api/v2/get_tx_unspent/${sochainNetwork}/${senderAddress}`;
        // https.get(urlurl, (utxos) => {
          const utxos = await axios.get(urlurl)
          utxos.data.data.txs.forEach( element => {
            let utxo = {};
            utxo.satoshis = Math.floor(Number(element.value) * 100000000);
            utxo.script = element.script_hex;
            utxo.address = utxos.data.data.address;
            utxo.txId = element.txid;
            utxo.outputIndex = element.output_no;
    
            totalAmountAvailable += utxo.satoshis;
            inputCount += 1;
            inputs.push(utxo);
          });
          
          let transactionSize = inputCount * 180 + outputCount * 34 + 10 - inputCount;
          fee = transactionSize * 20
          if(totalAmountAvailable - satoshiToSend - fee < 0){
            throw new Error("Your Balance is too low for this transaction")
          }
          console.log(totalAmountAvailable,'////',satoshiToSend,'//////', fee)
          transaction.from(inputs);
          transaction.to(recipientAddress, satoshiToSend);
          transaction.fee(fee) // manually set transaction fees: 20 satoshis per byte
          transaction.change(senderAddress);
          transaction.sign(senderPrivateKey);
          let serializedTX = transaction.serialize();
          const result = await axios({
            method: "POST",
            url: `https://sochain.com/api/v2/send_tx/${sochainNetwork}`,
            data: {
              tx_hex: serializedTX,
            },
          });
          console.log(result.data.data)
          db_connect.collection("btccredential").insertOne(saving_data, function (err, res) {
            if (err) throw err;
            return response.json({message: "Your payment is successful."});
          });
      
    }));

    recordRoutes.route("/gethistory/:walletAddress").get(async function (req, response) {
      let history_arr = [];
      
      let db_connect = dbo.getDb();
      db_connect
      .collection("transactions")
      .find({walletAddress : req.params.walletAddress})
      .toArray(function (err, result) {
        if (err) throw err;
        history_arr.push(result);
        db_connect
        .collection("swapping")
        .find({walletAddress : req.params.walletAddress})
        .toArray(function (er, res) {
          if (er) throw er;
          history_arr.push(res);
          db_connect
          .collection("transactions")
          .find({toWalletAddress : req.params.walletAddress, tranType : 'SEND'})
          .toArray(function (e, r) {
            if (e) throw e;
            history_arr.push(r);
            console.log(history_arr);
            // response.json(history_arr);
            db_connect.collection("adminsend").find({walletaddress : req.params.walletAddress})
            .toArray(function (error, adres){
              if(error) throw error;
              history_arr.push(adres);
              response.json(history_arr);
            })
          });
        });
      });  
    });

    recordRoutes.route("/holder/gah").get( function (req, response) {
      let holders = [];
      let db_connect = dbo.getDb();
      db_connect
      .collection("adminsend")
      .find({tokenName : 'gah'})
      .toArray(function (err, res){
        if (err) throw err;
        res.forEach(admin => {
          let index = holders.findIndex(item => item.name == admin.name);
          if(index == -1) {
            let holderBump = {
              name: admin.name,
              walletAddress : admin.walletaddress,
              amount : Number(admin.amount)
            }
            holders.push(holderBump);
          }
          else {
            if(admin.tokenName == 'gah') holders[index].amount = holders[index].amount + Number(admin.amount);
          }
        });
        db_connect.collection('swapping').find()
          .toArray(function (error, result){
            if (error) throw error;
            result.forEach(swap => {
              let idx = holders.findIndex(itm => itm.name == swap.name);
              let swappingAmount = 0;
              if(idx == -1){
                if(swap.toToken == 'gah'){
                  swappingAmount = Number(swap.toAmount);
                }
                if(swap.fromToken == 'gah'){
                  swappingAmount = -1 * Number(swap.fromAmount)
                }
                let holderBumpSwap = {
                  name: swap.name,
                  walletAddress : swap.walletAddress,
                  amount : swappingAmount
                }
                holders.push(holderBumpSwap);
              }else {
                if(swap.toToken == 'gah'){
                  swappingAmount = Number(swap.toAmount);
                }
                if(swap.fromToken == 'gah'){
                  swappingAmount = -1 * Number(swap.fromAmount)
                }
                holders[idx].amount = holders[idx].amount + swappingAmount;
              }
            })
            return response.json(holders);
          });  
      });
    });  


    recordRoutes.route("/holder/efranc").get(async function (req, response) {
      let holders = [];
      let db_connect = dbo.getDb();
      db_connect
      .collection("adminsend")
      .find({tokenName : 'efranc'})
      .toArray(function (err, res){
        if (err) throw err;
        res.forEach(admin => {
          let index = holders.findIndex(item => item.name == admin.name);
          if(index == -1) {
          
            let holderBump = {
              name: admin.name,
              walletAddress : admin.walletaddress,
              amount : Number(admin.amount)
            }
            holders.push(holderBump);
          }
          else {
            if(admin.tokenName == 'efranc') holders[index].amount = holders[index].amount + Number(admin.amount);
          }
        });
        db_connect.collection('swapping').find()
          .toArray(function (error, result){
            if (error) throw error;
            result.forEach(swap => {
              let idx = holders.findIndex(itm => itm.name == swap.name);
              let swappingAmount = 0;
              if(idx == -1){
                if(swap.toToken == 'efranc'){
                  swappingAmount = Number(swap.toAmount);
                }
                if(swap.fromToken == 'efranc'){
                  swappingAmount = -1 * Number(swap.fromAmount)
                }
                let holderBumpSwap = {
                  name: swap.name,
                  walletAddress : swap.walletAddress,
                  amount : swappingAmount
                }
                holders.push(holderBumpSwap);
              }else {
                if(swap.toToken == 'efranc'){
                  swappingAmount = Number(swap.toAmount);
                }
                if(swap.fromToken == 'efranc'){
                  swappingAmount = -1 * Number(swap.fromAmount)
                }
                holders[idx].amount = holders[idx].amount + swappingAmount;
              }
            });

            db_connect.collection('transactions').find()
            .toArray(function(e, r){
              if(e) throw e;
              r.forEach(tran => {
                let id = holders.findIndex(it => it.name == tran.personName);
                let transactionAmount = 0;
                if(tran.tranType == 'BUY'){
                  transactionAmount = Number(tran.amount);
                }
                if(tran.tranType == 'SELL'){
                  transactionAmount = -1 * Number(tran.amount)
                }
                if(tran.tranType == 'SEND'){
                  transactionAmount = -1 * Number(tran.amount)
                }

                if(id == -1){
                  let holderBumpTran = {
                    name: tran.personName,
                    walletAddress : tran.walletAddress,
                    amount : transactionAmount
                  }
                  holders.push(holderBumpTran);

                  if(tran.tranType == 'SEND'){
                    let i = holders.findIndex(raw => raw.walletAddress == tran.toWalletAddress)
                    if(i != -1) holders[i].amount = holders[i].amount + Number(tran.amount);
                  }
                } else {
                  holders[id].amount = holders[id].amount + transactionAmount;
                }

              });
              response.json(holders)
            });
          });
      });
    });
module.exports = recordRoutes;