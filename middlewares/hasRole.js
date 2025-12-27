const hasRole = (...allowedRoles) => {
	return (req, res, next) => {
		if (!req.user || !req.user.role) {
			return res.status(403).json({ msg: 'Rol no definido' });
		}

		if (!allowedRoles.includes(req.user.role.role)) {
			console.log('allowedRoles', allowedRoles);
			console.log('role:', req.user.role.role);
			return res.status(403).json({
				msg: 'No tiene permisos suficientes',
			});
		}

		next();
	};
};

module.exports = { hasRole };
