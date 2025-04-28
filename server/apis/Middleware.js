//* 사용자 미들웨어를 직접 구현

// 로그인 확인 미들웨어
exports.isLoggedIn = (req, res, next) => {
    // isAuthenticated()로 검사해 로그인이 되어있으면
    if (req.isAuthenticated()) {
        console.log(req.isAuthenticated())
        next(); // 다음 미들웨어
    } else {
        res.status(401).json({ msg: '로그인이 필요합니다.' });
    }
};

// 로그인 안됨 확인 미들웨어
exports.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        next(); // 로그인 안되어있으면 다음 미들웨어
    } else {
        const message = encodeURIComponent('로그인한 상태입니다.');
        // res.redirect(`/?error=${message}`);
        res.status(401).json({msg: "로그인한 상태입니다,"})
    }
};

// 관리자 권한 확인 미들웨어
exports.isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ msg: '로그인이 필요합니다.' });
    }
    
    if (req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ msg: '관리자 권한이 필요합니다.' });
    }
};

// 모더레이터 또는 관리자 권한 확인 미들웨어
exports.isModeratorOrAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ msg: '로그인이 필요합니다.' });
    }
    
    if (req.user.role === 'moderator' || req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ msg: '권한이 없습니다.' });
    }
};