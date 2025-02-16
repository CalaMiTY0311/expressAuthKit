const { mongo, redisClient } = require("./dependencie")

const SessionCheck = async (req, res, next) => {
    try {
        const sessionToken = req.cookies.SID;
        // console.log("session : ",sessionToken)
        if (sessionToken) {
            const checkSID = await redisClient.get(sessionToken);
            console.log(checkSID)
            if (checkSID) {
                return res.status(403).json({ msg : "Already logged in" });
            }
        }
        next();
    } catch (error) {
        console.error("Redis session check error:", error);
        res.status(500).json({ msg : error });
    }
};


module.exports = SessionCheck;
