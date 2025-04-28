const express = require('express');
const { v4: uuidv4 } = require('uuid');
const login = express.Router();
const AuthController = require('./authController');
const { redisClient, mongo } = require("../dependencie");
const { body, validationResult } = require('express-validator');

const totpEmail = require('./totpEmail');

const passport = require('passport');
const { isNotLoggedIn } = require('../Middleware');

//* 로그인 요청 - Passport 인증 사용
login.post('/login', isNotLoggedIn, (req, res, next) => {
   // local 전략으로 Passport 인증 실행
   passport.authenticate('local', (authError, user, info) => {
      // 인증 오류 처리
      if (authError) {
         console.error('패스포트 인증 오류:', authError);
         return next(authError);
      }
      
      // 인증 실패 처리
      if (!user) {
         return res.status(401).json(info);
      }

      // 2단계 인증(TOTP) 확인
      if (user.totpEnable === true) {
         // TOTP가 활성화된 경우, 인증 코드 전송 및 부분 세션 설정
         return handleTotpAuthentication(user, res);
      }

      // TOTP가 비활성화된 경우, 바로 로그인 처리
      return completeLogin(req, res, next, user);
   })(req, res, next);
});

// TOTP 인증 처리 함수
async function handleTotpAuthentication(user, res) {
   try {
      // 이메일로 인증 코드 보내기
      const emailAuthResult = await totpEmail.sendVerifyCode(user.email, user._id);
      
      if (!emailAuthResult.success) {
         return res.status(500).json({
            msg: "인증 코드 전송 중 오류가 발생했습니다."
         });
      }
      
      // 사용자에게 2단계 인증이 필요함을 알리고 사용자 정보를 반환
      return res.status(200).json({
         msg: "2단계 인증이 필요합니다. 이메일로 받은 인증 코드를 입력해주세요.",
         user: {
            UID: user._id,
            email: user.email,
            username: user.username,
            bio: user.bio,
            profilePicURL: user.profilePicURL,
            totpEnable: user.totpEnable,
            role: user.role
         },
         requires2FA: true
      });
   } catch (error) {
      console.error('TOTP 인증 처리 오류:', error);
      return res.status(500).json({
         msg: "서버 오류가 발생했습니다."
      });
   }
}

// 로그인 완료 함수
function completeLogin(req, res, next, user) {
   return req.login(user, loginError => {
      if (loginError) {
         console.error("로그인 오류:", loginError);
         return next(loginError);
      }
      
      // 클라이언트에 UID 쿠키 설정
      res.cookie('UID', user._id, {
         httpOnly: true,
         secure: 'true',
         maxAge: 24 * 60 * 60 * 1000, // 24시간
         sameSite: 'none'
      });
      
      // 로그인 성공 응답
      return res.status(200).json({ 
         "msg": "로그인 성공",
         "user": {
            UID: user._id,
            email: user.email,
            username: user.username,
            bio: user.bio,
            profilePicURL: user.profilePicURL,
            totpEnable: user.totpEnable,
            role: user.role
         }        
      });
   });
}

// 2단계 인증 코드 검증
login.post('/verifyEmail', [
   body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('유효한 6자리 인증 코드를 입력하세요'),
   body('UID').notEmpty().withMessage('사용자 ID가 필요합니다.')
], async (req, res, next) => {
   try {
      // 입력 유효성 검사
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         return res.status(400).json({
            msg: errors.array()[0].msg
         });
      }

      const { code, UID } = req.body;
      
      // 인증 코드 검증
      const verificationResult = await totpEmail.checkVerifyCode(UID, code);
      
      if (!verificationResult.success) {
         return res.status(400).json({
            msg: verificationResult.message
         });
      }

      // 사용자 정보 조회
      const users = await mongo.selectDB({ _id: UID });
      if (!users || users.length === 0) {
         return res.status(404).json({
            msg: "사용자를 찾을 수 없습니다."
         });
      }
      
      const user = users[0];
      
      // 인증 코드 삭제
      await redisClient.del(`verifyEmail:${UID}`);
      
      // 자동 로그인 처리
      req.login(user, loginError => {
         if (loginError) {
            console.error('2FA 후 로그인 오류:', loginError);
            return res.status(500).json({ msg: '로그인 처리 중 오류가 발생했습니다.' });
         }

         // 클라이언트에 UID 쿠키 설정
         res.cookie('UID', user._id, {
            httpOnly: true,
            secure: 'true',
            maxAge: 24 * 60 * 60 * 1000, // 24시간
            sameSite: 'none'
         });

         // 성공 응답
         return res.status(200).json({
            msg: "2단계 인증 성공, 로그인 완료",
            user: {
               UID: user._id,
               email: user.email,
               username: user.username,
               bio: user.bio,
               profilePicURL: user.profilePicURL,
               totpEnable: user.totpEnable,
               role: user.role
            }
         });
      });
   } catch (error) {
      console.error('2FA 인증 검증 오류:', error);
      return res.status(500).json({
         msg: '서버 오류가 발생했습니다.'
      });
   }
});

module.exports = login;