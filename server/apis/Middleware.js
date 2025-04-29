/**
 * 인증 및 권한 관련 미들웨어
 * 
 * 사용자 인증 상태 및 권한 확인에 사용되는 미들웨어 모음
 */

// 로그인 확인 미들웨어
exports.isLoggedIn = (req, res, next) => {
    // isAuthenticated()로 검사해 로그인이 되어있으면
    if (req.isAuthenticated()) {
        // 인증된 사용자는 다음 미들웨어로 이동
        next();
    } else {
        // 인증되지 않은 사용자는 401 Unauthorized 응답
        res.status(401).json({ 
            msg: '로그인이 필요합니다.' 
        });
    }
};

// 로그인 안됨 확인 미들웨어
exports.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        // 로그인 안 된 사용자는 다음 미들웨어로 이동
        next();
    } else {
        // 이미 로그인된 사용자에게는 오류 응답
        res.status(400).json({
            msg: "이미 로그인된 상태입니다."
        });
    }
};

// 관리자 권한 확인 미들웨어
exports.isAdmin = (req, res, next) => {
    // 먼저 로그인 여부 확인
    if (!req.isAuthenticated()) {
        return res.status(401).json({ 
            msg: '로그인이 필요합니다.' 
        });
    }
    
    // 관리자 권한 확인
    if (req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ 
            msg: '관리자 권한이 필요합니다.' 
        });
    }
};

// 모더레이터 또는 관리자 권한 확인 미들웨어
exports.isModeratorOrAdmin = (req, res, next) => {
    // 먼저 로그인 여부 확인
    if (!req.isAuthenticated()) {
        return res.status(401).json({ 
            msg: '로그인이 필요합니다.' 
        });
    }
    
    // 모더레이터 또는 관리자 권한 확인
    if (req.user.role === 'moderator' || req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ 
            msg: '권한이 없습니다. 모더레이터 또는 관리자만 접근 가능합니다.' 
        });
    }
};