const jwt = require('jsonwebtoken');
const config = require('config');


function getUserFromToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // JWT_SECRET should be stored in your environment variables
        return decoded; // Assuming decoded token contains user info like userId and role
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

// check permission
function checkPermission(userRole, allowedRoles) {
    if (!allowedRoles.includes(userRole)) {
        throw new Error(`Permission Error: Only ${allowedRoles.join(', ')} can perform this action.`);
    }
}
// Middleware to check if the user is authorized (based on token)
function auth(req, res, next) {
    const token = req.headers['x-auth-token'];
    
    if (!token) {
        return res.status(401).send("Access denied. No token provided.");
    }

    try {
        const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
        req.user = decoded;
        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        return res.status(400).send("Invalid token.");
    }
}

// Middleware to authorize users based on their role
function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).send("Access denied. You do not have the required role.");
        }
        next(); // Proceed if the user has the correct role
    };
}


module.exports = { auth, authorizeRoles ,getUserFromToken,checkPermission};
