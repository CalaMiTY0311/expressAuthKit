const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logout = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

const { sessionCheck } = require("../Middleware")

logout.post('/logout',sessionCheck, async (req, res) => {
    const result = await AuthController.logout(req);
    if (result.status===200){
        const SID = result.SID;
        await redisClient.del(`session:${SID}`)
        res.clearCookie('SID');
        res.clearCookie('UID');
    }
    res.status(result.status).json(result.data.msg)
});

module.exports = logout;