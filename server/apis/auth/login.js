const express = require('express');
const { v4: uuidv4 } = require('uuid');
const login = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

const SessionCheck = require("../Middleware")

login.post('/login', SessionCheck, async (req, res) => {
    const result = await AuthController.login(req);
    if (result.status === 200) {
        const sessionToken = uuidv4();
        res.cookie('SID', sessionToken, {
            httpOnly: true,      // 브라우저 접근 제한
            // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
            secure: true,       // HTTP 환경에서 작동하도록 설정
            maxAge: 36000 * 1000,
          });
        await redisClient.setEx(sessionToken, 3600, JSON.stringify(result.data.user)); 

        const keys = await redisClient.keys('*');
        console.log("keys",keys)
        // 레디스 전체 값 조회
        for (let key of keys) {
            const value = await redisClient.get(key);
            // console.log(`Key: ${key}, Value: ${value}`);
        }
        res.status(result.status).json(result.data);
    } else {
        res.status(result.status).json(result.data);
    }
});

module.exports = login;
