const express = require('express');
const { v4: uuidv4 } = require('uuid');
const login = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

const SessionCheck = require("../Middleware")

login.post('/login', SessionCheck, async (req, res) => {
const result = await AuthController.login(req);
if (result.status === 200) {
    const SID = uuidv4();
    res.cookie('SID', SID, {
        httpOnly: true,      // 브라우저 접근 제한
        // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
        secure: true,       // HTTP 환경에서 작동하도록 설정
        maxAge: 36000 * 1000,
        });

    _id = result.data.user._id;
    console.log(_id,typeof _id)

    await redisClient.setEx(`session:${SID}`, 3600, JSON.stringify({ _id: _id })); 
    // await redisClient.sAdd(`user_sessions:${_id}`, SID);

    res.status(result.status).json(result.data);
} else {
    res.status(result.status).json(result.data);
}
});

module.exports = login;
