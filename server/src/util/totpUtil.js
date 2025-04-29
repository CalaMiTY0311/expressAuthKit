/**
 * TOTP(Time-based One-Time Password) 인증 유틸리티
 * 
 * 이메일을 통한 2단계 인증 기능을 제공합니다.
 * - 인증 코드 생성 및 이메일 전송
 * - Redis를 사용한 인증 코드 저장 및 검증
 */

const { redisClient } = require('../../apis/dependencie');
const nodemailer = require('nodemailer');

// 이메일 트랜스포터 (전역 변수)
let transporter = null;
let testAccount = null;

/**
 * 이메일 트랜스포터 초기화
 * 
 * 환경변수:
 * - EMAIL_USER: 이메일 발신 계정
 * - EMAIL_PASSWORD: 이메일 발신 계정 비밀번호
 * 
 * @returns {Promise<boolean>} 초기화 성공 여부
 */
const initializeTransporter = async () => {
    console.log('📧 이메일 트랜스포터 초기화 중...');
    
    // 실제 Gmail 계정 사용
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        try {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
            
            // 연결 테스트
            await transporter.verify();
            console.log('✅ Gmail 트랜스포터 초기화 성공');
            console.log(`   발신 계정: ${process.env.EMAIL_USER}`);
            return true;
        } catch (error) {
            console.error('❌ Gmail 트랜스포터 초기화 실패:', error);
            // Gmail 실패 시 테스트 계정으로 대체
        }
    }
    
    // 테스트 계정 사용 (개발 용도)
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
        
        console.log('✅ Ethereal 테스트 트랜스포터 초기화 성공');
        console.log(`   테스트 계정: ${testAccount.user}`);
        console.log('   이메일은 실제로 전송되지 않으며, 콘솔에 미리보기 URL이 표시됩니다.');
        return true;
    } catch (err) {
        console.error('❌ 모든 이메일 트랜스포터 초기화 실패:', err);
        return false;
    }
};

// 서버 시작 시 트랜스포터 초기화
initializeTransporter().catch(console.error);

/**
 * 6자리 인증 코드 생성
 * @returns {string} 6자리 인증 코드
 */
const generateTotpCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 이메일로 인증 코드 전송
 * @param {string} email - 수신자 이메일 주소
 * @param {string} code - 6자리 인증 코드
 * @returns {Promise<Object>} 이메일 전송 결과
 */
const sendTotpEmail = async (email, code) => {
    // 트랜스포터가 초기화되지 않았으면 초기화
    if (!transporter) {
        const initialized = await initializeTransporter();
        if (!initialized) {
            throw new Error('이메일 트랜스포터를 초기화할 수 없습니다.');
        }
    }

    // 발신자 이메일 설정
    const sender = process.env.EMAIL_USER || (testAccount ? testAccount.user : 'noreply@example.com');
    
    // 이메일 옵션 설정
    const mailOptions = {
        from: `"인증 시스템" <${sender}>`,
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

    try {
        // 이메일 전송
        const result = await transporter.sendMail(mailOptions);
        
        // 테스트 계정인 경우 미리보기 URL 로그
        if (testAccount) {
            const previewURL = nodemailer.getTestMessageUrl(result);
            console.log(`📧 테스트 이메일 전송됨 - 미리보기: ${previewURL}`);
        } else {
            console.log(`📧 이메일 전송됨: ${email}`);
        }
        
        return {
            success: true,
            messageId: result.messageId,
            previewUrl: testAccount ? nodemailer.getTestMessageUrl(result) : null
        };
    } catch (error) {
        console.error('❌ 이메일 전송 오류:', error);
        throw error;
    }
};

/**
 * 인증 코드 생성, 저장 및 이메일 전송
 * @param {string} email - 사용자 이메일
 * @param {string} userId - 사용자 ID
 * @param {number} [expireSeconds=600] - 코드 유효 시간(초)
 * @returns {Promise<Object>} 결과 객체
 */
const sendVerificationCode = async (email, userId, expireSeconds = 600) => {
    try {
        // 인증 코드 생성
        const totpCode = generateTotpCode();
        console.log(`🔑 사용자 ${userId}의 인증 코드 생성: ${totpCode}`);

        // Redis에 인증 코드 저장 (기본 10분 유효)
        await redisClient.setEx(`verifyEmail:${userId}`, expireSeconds, totpCode);
        // 인증 코드로 사용자 ID를 찾을 수 있도록 역방향 매핑도 저장
        await redisClient.setEx(`verifyCode:${totpCode}`, expireSeconds, userId);
        
        // 이메일 전송
        await sendTotpEmail(email, totpCode);

        return {
            success: true,
            message: '인증 코드가 이메일로 전송되었습니다.'
        };
    } catch (error) {
        console.error('❌ 인증 코드 생성 및 전송 오류:', error);
        return {
            success: false,
            message: '인증 코드 전송 중 오류가 발생했습니다.',
            error
        };
    }
};

/**
 * 인증 코드 검증 함수
 * @param {string} codeOrUserId - 검증할 코드 또는 사용자 ID
 * @param {string} [code=null] - 사용자 ID와 함께 검증할 코드 (선택 사항)
 * @returns {Promise<Object>} 검증 결과
 */
const verifyTotpCode = async (codeOrUserId, code = null) => {
    try {
        // UID와 코드 둘 다 제공된 경우
        if (code) {
            const storedCode = await redisClient.get(`verifyEmail:${codeOrUserId}`);
            
            if (!storedCode || storedCode !== code) {
                return {
                    success: false,
                    message: '인증 코드가 올바르지 않습니다.'
                };
            }
            
            return {
                success: true,
                message: '인증이 완료되었습니다.',
                userId: codeOrUserId
            };
        } 
        // 코드만 제공된 경우 
        else {
            const userId = await redisClient.get(`verifyCode:${codeOrUserId}`);
            
            if (!userId) {
                return {
                    success: false,
                    message: '인증 코드가 올바르지 않거나 만료되었습니다.'
                };
            }
            
            const storedCode = await redisClient.get(`verifyEmail:${userId}`);
            
            if (!storedCode || storedCode !== codeOrUserId) {
                return {
                    success: false,
                    message: '인증 코드가 올바르지 않습니다.'
                };
            }
            
            return {
                success: true,
                message: '인증이 완료되었습니다.',
                userId
            };
        }
    } catch (error) {
        console.error('❌ 인증 코드 검증 오류:', error);
        return {
            success: false,
            message: '인증 코드 검증 중 오류가 발생했습니다.',
            error
        };
    }
};

/**
 * 인증 코드 삭제 함수
 * @param {string} userId - 사용자 ID
 * @param {string} code - 인증 코드
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
const clearTotpCode = async (userId, code) => {
    try {
        await redisClient.del(`verifyEmail:${userId}`);
        await redisClient.del(`verifyCode:${code}`);
        console.log(`🧹 사용자 ${userId}의 인증 코드 삭제 완료`);
        return true;
    } catch (error) {
        console.error('❌ 인증 코드 삭제 오류:', error);
        return false;
    }
};

module.exports = {
    generateTotpCode,
    sendTotpEmail,
    sendVerificationCode,
    verifyTotpCode,
    clearTotpCode
};