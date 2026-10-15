const { response } = require('express');

const isAdminRole = async (req, res = response, next) => {
	if (!req.user) {
		return res.status(500).json({
			msg: 'Se quiere verificar el role sin validar el token primero',
		});
	}

	const role = req.role;

	const isSuperAdmin =
		role === 'SUPER_ADMIN_ROLE' ||
		role === process.env.SUPER_ADMIN_ROLE;
	const isAdmin =
		role === 'ADMIN_ROLE' ||
		role === process.env.ADMIN_ROLE;

	if (!isAdmin && !isSuperAdmin) {
		return res.status(401).json({
			msg: `No es administrador - No puede hacer esto - ${role}`,
		});
	}

	next();
};

const isSuperAdminRole = async (req, res = response, next) => {
	if (!req.user) {
		return res.status(500).json({
			ok: false,
			msg: 'Se quiere verificar el role sin validar el token primero',
		});
	}

	const role = req.role;

	const isSuperAdmin =
		role === 'SUPER_ADMIN_ROLE' ||
		role === process.env.SUPER_ADMIN_ROLE;

	if (!isSuperAdmin) {
		return res.status(403).json({
			ok: false,
			msg: 'Acceso denegado: Se requiere rol de Super Administrador del sistema',
		});
	}

	next();
};

const haveRole = (...roles) => {
	return (req, res = response, next) => {
		if (!req.user) {
			return res.status(500).json({
				msg: 'Se quiere verificar el role sin validar el token primero',
			});
		}

		if (!roles.includes(req.user.rol)) {
			return res.status(401).json({
				msg: `El servicio requiere uno de estos roles ${roles}`,
			});
		}

		next();
	};
};

module.exports = {
	isAdminRole,
	isSuperAdminRole,
	haveRole,
};
