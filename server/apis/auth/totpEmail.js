// emailAuthService.js
const nodemailer = require('nodemailer');
const { redisClient } = require("../dependencie");

console.log(process.env.EMAIL_USER, process.env.EMAIL_PASSWORD)

let transporter;
let testAccount; // testAccount를 전역 변수로 선언

if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
    console.log('Gmail 트랜스포터로 초기화됨');
} else {
    // 환경 변수가 없는 경우 Ethereal 테스트 계정 사용
    async function initializeTestTransporter() {
        try {
            testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            console.log('Ethereal 테스트 트랜스포터로 초기화됨');
        } catch (err) {
            console.error('이메일 트랜스포터 초기화 오류:', err);
        }
    }

    // 초기화 함수 호출
    initializeTestTransporter();
}

// async function createVerifyCode(){
//     const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
//     return verifyCode
// }

// 이메일 인증 코드 전송 함수
async function sendEmail(email, code) {
    // transporter가 초기화되지 않았다면 대기
    if (!transporter) {
        await initializeTransporter();
    }

    const mailOptions = {
        from: process.env.EMAIL_USER || (testAccount ? testAccount.user : 'OracleMemory2@gmail.com'),
        to: email,
        subject: '로그인 인증 코드',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #333;">로그인 인증 코드</h2>
                <p>안녕하세요. 귀하의 계정 보안을 위한 인증 코드입니다:</p>
                <div style="background-color: #f5f5f5; padding: 10px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                    ${code}
                </div>
                <p>이 코드는 10분 동안 유효합니다.</p>
                <p>코드를 요청하지 않았다면 이 이메일을 무시하세요.</p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
}

// 인증 코드 생성 및 저장, 이메일 전송을 처리하는 통합 함수
async function sendVerifyCode(email, UID) {
    try {
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Redis에 인증 코드 저장 (10분 유효)
        await redisClient.setEx(`verifyEmail:${UID}`, 600, verifyCode);
        // 인증 코드로 UID를 찾을 수 있도록 역방향 맵핑도 저장
        await redisClient.setEx(`verifyCode:${verifyCode}`, 600, UID);
        // 사용자 이메일로 인증 코드 전송
        await sendEmail(email, verifyCode);

        return {
            success: true,
            message: '인증 코드가 이메일로 전송되었습니다.'
        };
    } catch (error) {
        console.error('인증 코드 생성 및 전송 오류:', error);
        return {
            success: false,
            message: '인증 코드 전송 중 오류가 발생했습니다.',
            error
        };
    }
}

// 인증 코드 검증 함수
async function checkVerifyCode(uidOrCode, code = null) {
    try {
        // UID와 코드를 모두 제공한 경우 (기존 방식)
        if (code) {
            // Redis에서 저장된 코드 조회
            const storedCode = await redisClient.get(`verifyEmail:${uidOrCode}`);
            console.log(storedCode)

            // 코드가 없거나 일치하지 않으면 실패
            if (!storedCode || storedCode !== code) {
                return {
                    success: false,
                    message: '인증 코드가 올바르지 않습니다.'
                };
            }
            return {
                success: true,
                message: '인증이 완료되었습니다.',
                UID: uidOrCode
            };
        } 
        // 코드만 제공한 경우 (새로운 방식)
        else {
            // 코드로 UID 조회
            const UID = await redisClient.get(`verifyCode:${uidOrCode}`);
            if (!UID) {
                return {
                    success: false,
                    message: '인증 코드가 올바르지 않거나 만료되었습니다.'
                };
            }
            
            // 저장된 인증 코드 확인
            const storedCode = await redisClient.get(`verifyEmail:${UID}`);
            if (!storedCode || storedCode !== uidOrCode) {
                return {
                    success: false,
                    message: '인증 코드가 올바르지 않습니다.'
                };
            }
            
            return {
                success: true,
                message: '인증이 완료되었습니다.',
                UID
            };
        }
    } catch (error) {
        console.error('인증 코드 검증 오류:', error);
        return {
            success: false,
            message: '인증 코드 검증 중 오류가 발생했습니다.',
            error
        };
    }
}

module.exports = {
    // generateEmailCode,
    sendEmail,
    sendVerifyCode,
    checkVerifyCode
};