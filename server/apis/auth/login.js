const express = require('express');
const { v4: uuidv4 } = require('uuid');
const login = express.Router();
const AuthController = require('./authController');
const { redisClient } = require("../dependencie");
const { body, validationResult } = require('express-validator');

// import qrcode from 'qrcode';                 #qr코드 인증에 필요한 라이브러리 추후 구현 예정
// import { authenticator } from 'otplib';

const totpEmail = require('./totpEmail');

// const { blockAgainLogin } = require("../Middleware")
const passport = require('passport');
const {
    // blockAgainLogin,
    isNotLoggedIn 
} = require('../Middleware');

//* 로그인 요청
// 사용자 미들웨어 isNotLoggedIn 통과해야 async (req, res, next) => 미들웨어 실행
login.post('/login', isNotLoggedIn, (req, res, next) => {
   //? local로 실행이 되면 localstrategy.js를 찾아 실행한다.
   passport.authenticate('local', (authError, user, info) => {
      //? (authError, user, info) => 이 콜백 미들웨어는 localstrategy에서 done()이 호출되면 실행된다.
      //? localstrategy에 done()함수에 로직 처리에 따라 1,2,3번째 인자에 넣는 순서가 달랐는데 그 이유가 바로 이것이다.
    console.log("authError : ", authError)
    console.log("user : ", user)
    console.log("info : ", info)
      // done(err)가 처리된 경우
      if (authError) {
        //  console.error(authError);
         return next(authError); // 에러처리 미들웨어로 보낸다.
      }
      // done(null, false, { message: '비밀번호가 일치하지 않습니다.' }) 가 처리된 경우
      if (!user) {
         // done()의 3번째 인자 { message: '비밀번호가 일치하지 않습니다.' }가 실행
         res.status(401).json({"data" : {"msg" : "존재하지 않는 사용자 입니다."}})
      }

      //? done(null, exUser)가 처리된경우, 즉 로그인이 성공(user가 false가 아닌 경우), passport/index.js로 가서 실행시킨다
      console.log(user)
      return req.login(user, loginError => {
         //? loginError => 미들웨어는 passport/index.js의 passport.deserializeUser((id, done) => 가 done()이 되면 실행하게 된다.
         // 만일 done(err) 가 됬다면,
         if (loginError) {
            console.error(loginError);
            return next(loginError);
         }
         // done(null, user)로 로직이 성공적이라면, 세션에 사용자 정보를 저장해놔서 로그인 상태가 된다.
         console.log("/login router : ", user)
         res.status(200).json({ 
                                "msg" : "로그인 성공" ,
                                "user" : {
                                UID: user._id,
                                email: user.email,
                        username: user.username,
                        bio: user.bio,
                        profilePicURL: user.profilePicURL,
                        totpEnable: user.totpEnable
                    }        
                    })
      });
   })(req, res, next); //! 미들웨어 내의 미들웨어에는 콜백을 실행시키기위해 (req, res, next)를 붙인다.
});

// login.post('/login', blockAgainLogin,
//     async (req, res) => {
//         const result = await AuthController.login(req);

//         // 2차 인증 여부확인
//         if (result.status === 200) {
//             if (result.data.user.totpEnable === false) {
//                 await setSession(res, result.data.user.UID);
//                 res.status(result.status).json(result.data);
//             } else {
//                 try {
//                     // email로 인증 코드 보내는 함수
//                     const UID = result.data.user.UID;
//                     const email = result.data.user.email;
//                     const emailAuthResult = await totpEmail.sendVerifyCode(email, UID);

//                     if (!emailAuthResult.success) {
//                         return res.status(500).json({
//                             msg: "어스 서버 로그인 에러 발생"
//                         });
//                     }
//                     // 2FA 필요 상태를 클라이언트에 알림
//                     res.status(result.status).json(result.data);
//                 } catch (error) {
//                     console.error('이메일 인증 코드 전송 오류:', error);
//                     return res.status(500).json({
//                         msg: "인증 코드 전송 중 오류가 발생했습니다."
//                     });
//                 }
//             }
//         } else {
//             return res.status(result.status).json(result.data);
//         }
//     });

login.post('/verifyEmail', [
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('유효한 6자리 인증 코드를 입력하세요')
], async (req, res) => {
    try {
        // 입력 유효성 검사
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }
        const { code } = req.body;
        const UID = req.headers['uid'];
        if (!UID) {
            return res.status(401).json({
                status: 'error',
                message: '인증 세션이 만료되었습니다. 다시 로그인해주세요.'
            });
        }
        const verificationResult = await totpEmail.checkVerifyCode(UID, code);
        if (!verificationResult.success) {
            return res.status(400).json({
                status: 'error',
                message: verificationResult.message
            });
        }
        await setSession(res, UID);
        await redisClient.del(`verifyEmail:${UID}`);

        // 성공 응답
        return res.status(200).json({
            status: 'success',
            message: '2단계 인증이 완료되었습니다.'
        });

    } catch (error) {
        console.error('2FA 인증 검증 오류:', error);
        return res.status(500).json({
            status: 'error',
            message: '인증 처리 중 오류가 발생했습니다.'
        });
    }
});

module.exports = login;