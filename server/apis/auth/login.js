const express = require('express');

const login = express.Router();
const AuthController = require('../../src/util/AuthController'); // 경로 변경
const { redisClient, mongo } = require("../dependencie");
const { body, validationResult } = require('express-validator');
const { createResponse } = require('../../src/util/helperFunc'); // createResponse 추가

const totpUtil = require('../../src/util/totpUtil');

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
      const emailAuthResult = await totpUtil.sendVerificationCode(user.email, user._id);
      
      if (!emailAuthResult.success) {
         return res.status(500).json(createResponse(500, "인증 코드 전송 중 오류가 발생했습니다.").data);
      }
      
      // 필요한 사용자 정보만 필터링
      const filteredUser = {
         UID: user._id,
         email: user.email,
         username: user.username,
         profilePicURL: user.profilePicURL,
         totpEnable: true
      };
      
      // 사용자에게 2단계 인증이 필요함을 알림
      const responseData = createResponse(200, "2단계 인증이 필요합니다. 이메일로 받은 인증 코드를 입력해주세요.", {
         user: filteredUser,
         requires2FA: true
      });
      return res.status(200).json(responseData.data);
   } catch (error) {
      console.error('TOTP 인증 처리 오류:', error);
      return res.status(500).json(createResponse(500, "서버 오류가 발생했습니다.").data);
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
         secure: true,
         maxAge: 24 * 60 * 60 * 1000, // 24시간
         sameSite: 'none'
      });
      
      // 필요한 사용자 정보만 필터링
      const filteredUser = {
         UID: user._id,
         email: user.email,
         username: user.username,
         profilePicURL: user.profilePicURL,
         totpEnable: !!user.totpEnable,
         role: user.role
      };
      
      // 로그인 성공 응답
      const responseData = createResponse(200, "로그인 성공", {
         user: filteredUser
      });
      return res.status(200).json(responseData.data);
   });
}

// 2단계 인증 코드 검증
login.post('/verifyEmail', [
   body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('유효한 6자리 인증 코드를 입력하세요')
], async (req, res, next) => {
   try {
      // 입력 유효성 검사
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         return res.status(400).json(createResponse(400, errors.array()[0].msg).data);
      }

      const { code } = req.body;
      
      // 인증 코드로 사용자 ID 검증
      const verificationResult = await totpUtil.verifyTotpCode(code);
      
      if (!verificationResult.success) {
         return res.status(400).json(createResponse(400, verificationResult.message).data);
      }

      // 사용자 ID 가져오기
      const UID = verificationResult.userId;
      const users = await mongo.selectDB({ _id: UID });
      if (!users || users.length === 0) {
         return res.status(404).json(createResponse(404, "사용자를 찾을 수 없습니다.").data);
      }
      
      const user = users[0];
      
      // 인증 코드 삭제 (검증 후 즉시 처리)
      await totpUtil.clearTotpCode(UID, code);
      
      // 자동 로그인 처리
      req.login(user, loginError => {
         if (loginError) {
            console.error('2FA 후 로그인 오류:', loginError);
            return res.status(500).json(createResponse(500, '로그인 처리 중 오류가 발생했습니다.').data);
         }

         // 클라이언트에 UID 쿠키 설정
         res.cookie('UID', user._id, {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000, // 24시간
            sameSite: 'none'
         });

         // 성공 응답
         // 필요한 사용자 정보만 필터링
         const filteredUser = {
            UID: user._id,
            email: user.email,
            username: user.username,
            profilePicURL: user.profilePicURL,
            totpEnable: true,
            role: user.role
         };
         
         const responseData = createResponse(200, "2단계 인증 성공, 로그인 완료", {
            user: filteredUser
         });
         return res.status(200).json(responseData.data);
      });
   } catch (error) {
      console.error('2FA 인증 검증 오류:', error);
      return res.status(500).json(createResponse(500, '서버 오류가 발생했습니다.').data);
   }
});

module.exports = login;