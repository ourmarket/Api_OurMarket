const jwt = require('jsonwebtoken');
const { logger } = require('./logger');

/* const getToken = (id = "") => {
  return new Promise((resolve, reject) => {
    const payload = { id };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
      (err, token) => {
        if (err) {
          console.log(err);
          reject("No se pudo generar el token");
        } else {
          resolve(token);
        }
      }
    );
  });
}; */

const getToken = (payload) => {
	return jwt.sign(
		{
			data: payload,
		},
		process.env.JWT_SECRET,
		{ expiresIn: '1h' }
	);
};

const getTokenData = (token) => {
	if (!token) return null;

	// 1. Try decoding with JWT_SECRET (for customer portal x-token)
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		if (decoded) return decoded;
	} catch (err) {
		// Ignore and proceed to try JWT_REFRESH
	}

	// 2. Try decoding with JWT_REFRESH (for dashboard/tpv/delivery cookies)
	try {
		const decoded = jwt.verify(token, process.env.JWT_REFRESH);
		if (decoded) return decoded;
	} catch (err) {
		logger.error('Error al obtener data del token', err);
	}

	return null;
};
const getRefreshTokenData = (token) => {
	if (!token) return null;

	try {
		const decoded = jwt.verify(token, process.env.JWT_REFRESH);
		return decoded;
	} catch (err) {
		logger.error('Error al obtener data del token refresh', err);
		return null;
	}
};

module.exports = {
	getToken,
	getTokenData,
	getRefreshTokenData,
};
