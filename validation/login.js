const Validator = require("validator");
const isEmpty = require("is-empty");
module.exports = function validateLoginInput(data) {
    let errors = {};
    data.phonenumber = !isEmpty(data.phonenumber) ? data.phonenumber : "";
    data.password = !isEmpty(data.password) ? data.password : "";
    if (Validator.isEmpty(data.phonenumber)) {
        errors.phonenumber = "Phone Number field is required";
    } 
    // else if (!Validator.isEmail(data.username)) {
    //     errors.username = "Username is invalid";
    // }
    if (Validator.isEmpty(data.password)) {
        errors.password = "Password field is required";
    }
    return {
        errors,
        isValid: isEmpty(errors)
    };
};