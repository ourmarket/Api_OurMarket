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
	let data = null;

	jwt.verify(token, process.env.JWT_REFRESH, async (err, decoded) => {
		if (err) {
			logger.error('Error al obtener data del token', err);
		} else {
			data = decoded;
		}
	});

	return data;
};
const getRefreshTokenData = (token) => {
	let data = null;
	jwt.verify(token, process.env.JWT_REFRESH, async (err, decoded) => {
		if (err) {
			logger.error('Error al obtener data del token', err);
		} else {
			data = decoded;
		}
	});

	return data;
};

module.exports = {
	getToken,
	getTokenData,
	getRefreshTokenData,
};
