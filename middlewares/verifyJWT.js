/* eslint-disable no-unreachable */
const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
	const token = req.header('x-token');

	if (!token) {
		return res.status(401).json({ ok: false, msg: 'No token provided' });
	}

	jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
		if (err) {
			console.error('JWT verification failed:', err.message);
			return res.status(403).json({ ok: false, msg: 'Invalid or expired token' });
		}

		// ✅ Token válido → guardamos info en req
		req.user = decoded.UserInfo?.id;
		req.role = decoded.UserInfo?.role;

		next(); // 🚀 continúa con el siguiente middleware o controlador
	});
};

module.exports = verifyJWT;
