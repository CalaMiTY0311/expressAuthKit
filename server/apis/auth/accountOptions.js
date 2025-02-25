const express = require('express');
const { v4: uuidv4 } = require('uuid');
const accountOptions = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

const {sessionCheck} = require("../Middleware");

// deleteAccount.post('/deleteAccount', async (req, res) => {
//     const { userId } = req.body;

//     try {
//         // 사용자 정보 확인 (MongoDB에서 사용자 정보 조회)
//         const user = await mongoControl.selectDB({ _id: userId });
//         if (!user || user.length === 0) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         // 사용자 세션 키 목록을 가져옴 (userSessions:{userId}에서 저장된 모든 세션 키를 조회)
//         const userSessions = await redisClient.sMembers(`userSessions:${userId}`);
        
//         if (userSessions.length > 0) {
//             // 사용자의 모든 세션 삭제
//             await redisClient.del(...userSessions);
            
//             // 사용자 세션 목록도 삭제
//             await redisClient.del(`userSessions:${userId}`);
//         }

//         // 사용자 정보 데이터베이스에서 삭제
//         const [deleteResult, errMsg] = await mongoControl.deleteDB({ _id: userId });

//         if (!deleteResult) {
//             return res.status(500).json({ message: `Failed to delete user: ${errMsg}` });
//         }

//         // 응답 보내기
//         res.status(200).json({ message: 'Account deleted successfully' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

accountOptions.delete('/deleteAccount/:id', sessionCheck, async (req, res) => {
    const result = await AuthController.deleteAccount(req);
    res.clearCookie(req.cookies.UID)
    res.status(result.status).json(result);
})

module.exports = accountOptions;