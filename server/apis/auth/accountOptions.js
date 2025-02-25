const express = require('express');
const { v4: uuidv4 } = require('uuid');
const accountOptions = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

const {sessionCheck} = require("../Middleware");

accountOptions.put('/updateAccount', sessionCheck, async(req,res)=>{
    const result = await AuthController.updateAccount(req);
    res.status(result.status).json(result.msg)
})

accountOptions.delete('/deleteAccount/:id', sessionCheck, async (req, res) => {
    const result = await AuthController.deleteAccount(req);
    res.clearCookie(req.cookies.UID)
    res.status(result.status).json(result);
})

module.exports = accountOptions;