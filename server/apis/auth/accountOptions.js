const express = require('express');
const accountOptions = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");
const { body, validationResult } = require('express-validator');

const {verifySession, verifyUid} = require("../Middleware");

accountOptions.put('/updateAccount', verifySession, verifyUid,  async(req,res)=>{
    const result = await AuthController.updateAccount(req);
    res.status(result.status).json(result.data)
})

// 비밀번호 변경 시 추가 인증로직은 필요 시 구현해야함
accountOptions.post('/changePassword', verifySession, verifyUid,
    [
        body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다')
    ],  async(req,res)=>{
    const result = await AuthController.changePassword(req);
    console.log(result)
    res.status(result.status).json(result.data)
})

// 유저 회원 탈퇴 시 추가 인증로직은 필요 시 따로 구현해야함
accountOptions.delete('/deleteAccount/:id', verifySession, verifyUid, async (req, res) => {
    const result = await AuthController.deleteAccount(req);
    if (result.status===200){
        const SID = req.cookies.SID;
        if (SID) {
            await redisClient.del(`session:${SID}`);
        }
    res.clearCookie(req.cookies.UID)
    res.clearCookie(req.cookies.SID)
    }
    res.status(result.status).json(result);
})

module.exports = accountOptions;