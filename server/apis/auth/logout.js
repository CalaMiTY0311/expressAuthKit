const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logout = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

logout.post('/logout', (req, res) => {
    AuthController.logout(req, res);
});

module.exports = logout;