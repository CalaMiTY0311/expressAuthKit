const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logout = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

logout.post('/logout', async (req, res) => {
    const result = await AuthController.logout(req);
    res.status(result.status).json(result.data.msg)
});

module.exports = logout;