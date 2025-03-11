const express = require('express');
const { v4: uuidv4 } = require('uuid');
const login = express.Router();
const AuthController = require('./authController');
const { redisClient } = require("../dependencie");
const { body, validationResult } = require('express-validator');

// import qrcode from 'qrcode';                 #qr코드 인증에 필요한 라이브러리 추후 구현 예정
// import { authenticator } from 'otplib';

const totpEmail = require('./totpEmail');

const { againLoginCheck } = require("../Middleware")

async function setSession(res, UID) {
    const SID = uuidv4();
    res.cookie('SID', SID, {
        httpOnly: true,      // 브라우저 접근 제한
        // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
        secure: true,       // HTTP 환경에서 작동하도록 설정
        maxAge: 36000 * 1000,
    });
    
    res.cookie('UID', UID, {
        httpOnly: true,
        secure: true,
        maxAge: 36000 * 1000,
    });
    await redisClient.setEx(`session:${SID}`, 3600, JSON.stringify({ UID: UID }));
    return;
}

login.post('/login', againLoginCheck,
    [
        // body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력하세요'),
        body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const result = await AuthController.login(req);
            if (result.status == 200) {
                const { user } = result;
                if (user.totpEnable == false) {
                    await setSession(res, user._id); 
                    res.status(result.status).json(result.data);
                } else {
                    const UID = user._id;
                    const email = user.email;

                    const emailAuthResult = await totpEmail.sendVerifyCode(email, UID);

                    if (!emailAuthResult.success) {
                        return res.status(result.status).json(result.data);
                    }
                    
                    res.status(200).json({
                        status: 'success',
                        message: '2FA 인증 코드가 이메일로 전송되었습니다.',
                        user: {
                            UID: UID,
                            email: email
                            // 필요한 사용자 정보 추가
                        }
                    });
                }
            } else {
                return res.status(result.status || 400).json({
                    status: 'error',
                    message: result.message || '로그인에 실패했습니다.'
                });
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            res.status(500).json({ 
                status: 'error',
                message: '인증 처리 중 오류가 발생했습니다.'
            });
        }
    }
);

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

// const express = require('express');
// const { v4: uuidv4 } = require('uuid');
// const login = express.Router();
// const AuthController = require('./authController');
// const { redisClient } = require("../dependencie");
// const { body, validationResult } = require('express-validator');

// const qrcode = require('qrcode');
// const { authenticator } = require('otplib');

// const { againLoginCheck } = require("../Middleware")

// login.post('/login', againLoginCheck,
//     [
//         // body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력하세요'),
//         body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다')
//     ],
//     async (req, res) => {
//         const result = await AuthController.login(req);
//         console.log(result);

//         if (result.status === 200) {
//             // 사용자 인증은 성공했지만 TOTP 확인이 필요한지 확인
//             const { user } = result;
            
//             // totpEnable 값이 false인 경우 TOTP 검증 과정 스킵
//             if (user.totpEnable === false) {
//                 // TOTP가 비활성화된 경우 - 세션 생성 바로 진행
//                 const SID = uuidv4();
//                 res.cookie('SID', SID, {
//                     httpOnly: true,      // 브라우저 접근 제한
//                     // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
//                     secure: true,       // HTTP 환경에서 작동하도록 설정
//                     maxAge: 36000 * 1000,
//                 });
//                 res.cookie('UID', result.user._id, {
//                     httpOnly: true,      // 브라우저 접근 제한
//                     // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
//                     secure: true,       // HTTP 환경에서 작동하도록 설정
//                     maxAge: 36000 * 1000,
//                 });

//                 // 세션 정보를 Redis에 저장
//                 await redisClient.setEx(`session:${SID}`, 3600, JSON.stringify({ _id: result.user._id }));
                
//                 return res.status(result.status).json(result.msg);
//             }
            
//             // 사용자의 TOTP 비밀 확인 (AuthController에서 가져온 사용자 정보에 totpSecret이 있다고 가정)
//             const totpSecret = user.totpSecret;

//             if (!totpSecret) {
//                 // TOTP가 설정되지 않은 경우 새로운 비밀 생성
//                 const secret = authenticator.generateSecret();
//                 // 사용자의 이메일 또는 다른 식별자를 사용
//                 const username = user.email || user.username || user._id;
//                 const keyUri = authenticator.keyuri(username, 'YourAppName', secret);
//                 const secretQrCode = await qrcode.toDataURL(keyUri);

//                 // console.log(username)
//                 // console.log(" ")
//                 // console.log(" ")
//                 // console.log(keyUri)
//                 // console.log(" ")
//                 // console.log(" ")
//                 // console.log(secretQrCode)
//                 // 대기 중인 TOTP 비밀을 Redis에 임시 저장
//                 await redisClient.setEx(`pending_totp:${user._id}`, 600, secret); // 10분 동안 유효

//                 // QR 코드와 함께 TOTP 설정이 필요하다는 응답 반환
//                 return res.status(403).json({ 
//                     error: 'missing_totp', 
//                     secretQrCode,
//                     userId: user._id,
//                     message: 'TOTP 설정이 필요합니다. QR 코드를 스캔하고 인증 코드를 제출하세요.'
//                 });
//             } else if (req.body.totpToken) {
//                 // TOTP 토큰이 제공되었을 때 검증
//                 const isValid = authenticator.verify({ 
//                     token: req.body.totpToken, 
//                     secret: totpSecret 
//                 });

//                 if (!isValid) {
//                     return res.status(401).json({ 
//                         error: 'invalid_totp', 
//                         message: '2단계 인증 코드가 유효하지 않습니다. 다시 시도하세요.' 
//                     });
//                 }
//                 // TOTP 검증 성공, 로그인 진행
//             } else {
//                 // TOTP가 설정되어 있지만 토큰이 제공되지 않은 경우
//                 return res.status(403).json({ 
//                     error: 'totp_verification_required',
//                     userId: user._id,
//                     message: '2단계 인증이 필요합니다. 인증 앱에서 코드를 입력하세요.'
//                 });
//             }

//             // 2FA 성공 또는 필요 없음 - 세션 생성 진행
//             const SID = uuidv4();
//             res.cookie('SID', SID, {
//                 httpOnly: true,      // 브라우저 접근 제한
//                 // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
//                 secure: true,       // HTTP 환경에서 작동하도록 설정
//                 maxAge: 36000 * 1000,
//             });
//             res.cookie('UID', result.user._id, {
//                 httpOnly: true,      // 브라우저 접근 제한
//                 // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
//                 secure: true,       // HTTP 환경에서 작동하도록 설정
//                 maxAge: 36000 * 1000,
//             });

//             // 세션 정보를 Redis에 저장
//             await redisClient.setEx(`session:${SID}`, 3600, JSON.stringify({ _id: result.user._id }));
            
//             res.status(result.status).json(result.msg);
//         } else {
//             res.status(result.status).json(result.data);
//         }
//     });

// // TOTP 설정 완료를 위한 새 엔드포인트
// login.post('/complete-totp-setup', async (req, res) => {
//     const { userId, totpToken } = req.body;
    
//     if (!userId || !totpToken) {
//         return res.status(400).json({ error: 'missing_params', message: '사용자 ID와 TOTP 토큰이 필요합니다.' });
//     }

//     // Redis에서 대기 중인 TOTP 비밀 검색
//     const pendingSecret = await redisClient.get(`pending_totp:${userId}`);
    
//     if (!pendingSecret) {
//         return res.status(400).json({ error: 'expired_setup', message: 'TOTP 설정 세션이 만료되었습니다. 다시 로그인하세요.' });
//     }

//     // 제공된 토큰 검증
//     const isValid = authenticator.verify({
//         token: totpToken,
//         secret: pendingSecret
//     });

//     if (!isValid) {
//         return res.status(401).json({ error: 'invalid_token', message: '유효하지 않은 TOTP 토큰입니다.' });
//     }

//     // 검증 성공, 사용자의 totpSecret 업데이트 (AuthController나 사용자 모델에 이 메서드 구현 필요)
//     try {
//         await AuthController.updateUserTotpSecret(userId, pendingSecret);
        
//         // Redis에서 대기 중인 비밀 삭제
//         await redisClient.del(`pending_totp:${userId}`);
        
//         return res.status(200).json({ 
//             success: true, 
//             message: '2단계 인증이 성공적으로 설정되었습니다. 이제 로그인할 수 있습니다.' 
//         });
//     } catch (error) {
//         console.error('TOTP 설정 오류:', error);
//         return res.status(500).json({ error: 'server_error', message: '2단계 인증 설정 중 오류가 발생했습니다.' });
//     }
// });

// // 기존 TOTP로 로그인하기 위한 엔드포인트
// login.post('/verify-totp', async (req, res) => {
//     const { userId, totpToken } = req.body;
    
//     if (!userId || !totpToken) {
//         return res.status(400).json({ error: 'missing_params', message: '사용자 ID와 TOTP 토큰이 필요합니다.' });
//     }

//     try {
//         // 사용자 정보 가져오기
//         const user = await AuthController.getUserById(userId);
        
//         if (!user || !user.totpSecret) {
//             return res.status(400).json({ error: 'invalid_user', message: '유효하지 않은 사용자 또는 TOTP 설정이 없습니다.' });
//         }

//         // TOTP 토큰 검증
//         const isValid = authenticator.verify({
//             token: totpToken,
//             secret: user.totpSecret
//         });

//         if (!isValid) {
//             return res.status(401).json({ error: 'invalid_token', message: '유효하지 않은 인증 코드입니다.' });
//         }

//         // 인증 성공, 세션 생성
//         const SID = uuidv4();
//         res.cookie('SID', SID, {
//             httpOnly: true,      
//             secure: true,       
//             maxAge: 36000 * 1000,
//         });
//         res.cookie('UID', user._id, {
//             httpOnly: true,      
//             secure: true,       
//             maxAge: 36000 * 1000,
//         });

//         // 세션 정보를 Redis에 저장
//         await redisClient.setEx(`session:${SID}`, 3600, JSON.stringify({ _id: user._id }));
        
//         return res.status(200).json({ success: true, message: '인증 성공! 로그인되었습니다.' });
//     } catch (error) {
//         console.error('TOTP 검증 오류:', error);
//         return res.status(500).json({ error: 'server_error', message: '인증 중 오류가 발생했습니다.' });
//     }
// });

// module.exports = login;