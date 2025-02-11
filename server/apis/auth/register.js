const express = require('express');
const register = express.Router();
const AuthController = require('./authController'); 

register.post('/register', (req, res) => {
    // console.log(req,res)
    AuthController.register(req, res);
});

module.exports = register;