const jwt = require('jsonwebtoken');
const secret = 'TWITTER-CLONE';
const User = require('./schemas/userSchema');

const generateToken = (userid) => {
    try {
        return jwt.sign({ userid: userid }, secret)
    } catch (error) {
        console.log(error)
    }
};
const verifyToken = (token) => {
    try {
        return jwt.verify(token, secret)
    } catch (error) {
        return null
    }
};
const verifyLogin = async (req, res, next) => {
    try {
        const token = req.cookies.token
        if (!token) {
            return res.json({
                notLogin: true
            })
        }
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.json({
                notLogin: true
            })
        }
        const user = await User.findOne({
            _id: decoded.userid
        })
        if (!user) {
            return res.json({
                notLogin: true
            })
        }
        req.user = user
        next()
    } catch (error) {
        console.log(error)
    }
};
module.exports = { generateToken, verifyLogin };