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
const validateLoginInput = require('../validation/login');
const validateRegisterInput = require('../validation/register');
const keys = require('../config/keys');


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
      person_name: req.body.person_name,
      person_position: req.body.person_position,
      person_level: req.body.person_level,
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
    console.log('>>>>>>>>>>>>>>>>>asjdfklasjkdfjskaljdfklsajkl', req.body)
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
                        id: user.id,
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

module.exports = recordRoutes;