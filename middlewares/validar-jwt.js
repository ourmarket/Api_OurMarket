const jwt = require('jsonwebtoken');
// const User = require("../models/user");

const validarJWT = async (req, res, next) => {
	const token =
		req.header('x-token') ||
		req.query?.token ||
		req.query?.['x-token'] ||
		req.cookies?.jwt_dashboard ||
		req.cookies?.jwt_tpv ||
		req.cookies?.jwt_deliveryApp ||
		req.headers?.authorization?.replace('Bearer ', '');

	if (!token) {
		return res.status(401).json({
			ok: false,
			msg: 'No hay token en la petición',
		});
	}

	jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
		if (err) {
			// Try refresh token secret if primary secret fails
			jwt.verify(token, process.env.JWT_REFRESH || process.env.JWT_SECRET, (err2, decoded2) => {
				if (err2) return res.sendStatus(403);
				req.user = decoded2?.UserInfo?.id || decoded2?.data?.UserInfo?.id || decoded2?.id;
				req.role = decoded2?.UserInfo?.role || decoded2?.data?.UserInfo?.role || decoded2?.role;
				req.superUser = decoded2?.UserInfo?.superUser || decoded2?.data?.UserInfo?.superUser || decoded2?.superUser;
				next();
			});
			return;
		}
		req.user = decoded?.UserInfo?.id || decoded?.data?.UserInfo?.id || decoded?.id;
		req.role = decoded?.UserInfo?.role || decoded?.data?.UserInfo?.role || decoded?.role;
		req.superUser = decoded?.UserInfo?.superUser || decoded?.data?.UserInfo?.superUser || decoded?.superUser;
		next();
	});
};
/* const validarJWT = async (req , res  next) => {
  const token = req.header("x-token");

  if (!token) {
    return res.status(401).json({
      msg: "No hay token en la petición",
    });
  }

  try {
    const { UserInfo } = jwt.verify(token, process.env.JWT_SECRET, (err) => {
      if (err) {
        return res.sendStatus(401).json({
          msg: "Error de token",
        });
      }
    });
  
    // leer el usuario que corresponde al uid
    const user = await User.findById(UserInfo.id);

    console.log(user);

    if (!user) {
      return res.status(401).json({
        msg: "Token no válido - user no existe DB",
      });
    }

    // Verificar si el uid tiene estado true
    if (!user.state) {
      return res.status(401).json({
        msg: "Token no válido - user con estado: false",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({
      msg: "Token no válido",
    });
  }
}; */

module.exports = {
	validarJWT,
};
