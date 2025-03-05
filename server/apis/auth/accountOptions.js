const express = require('express');
const accountOptions = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

const {sessionCheck} = require("../Middleware");

accountOptions.put('/updateAccount', sessionCheck, async(req,res)=>{
    const result = await AuthController.updateAccount(req);
    res.status(result.status).json(result.msg)
})

// 비밀번호 변경 시 추가 인증로직은 필요 시 구현해야함
accountOptions.post('/changePassword', sessionCheck, async(req,res)=>{
    const result = await AuthController.changePassword(req);
    const SID = req.cookies.SID;
        if (SID) {
            await redisClient.del(`session:${SID}`);
        }
    res.clearCookie(req.cookies.UID);
    res.clearCookie(req.cookies.SID);
    res.status(result.status).json(result.msg)
})

// 유저 회원 탈퇴 시 추가 인증로직은 필요 시 따로 구현해야함
accountOptions.delete('/deleteAccount/:id', sessionCheck, async (req, res) => {
    const result = await AuthController.deleteAccount(req);
    const SID = req.cookies.SID;
        if (SID) {
            await redisClient.del(`session:${SID}`);
        }
    res.clearCookie(req.cookies.UID)
    res.status(result.status).json(result);
})

module.exports = accountOptions;