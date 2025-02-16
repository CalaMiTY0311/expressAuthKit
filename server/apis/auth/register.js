const express = require('express');
const register = express.Router();
const AuthController = require('./authController'); 

register.post('/register', async (req, res) => {
    // console.log(req,res)
    const result = await AuthController.register(req);
    if (result.status===200){
        res.status(result.status).json(result);
    } else {
        res.status(result.status).json(result);
    }
});

module.exports = register;