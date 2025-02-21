const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logout = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

const { SessionCheck } = require("../Middleware")

logout.post('/logout',SessionCheck, async (req, res) => {
    const result = await AuthController.logout(req);
    res.status(result.status).json(result.msg)
});

module.exports = logout;