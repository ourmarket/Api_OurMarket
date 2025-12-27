const allowRoles = (...roles) => {
    return (req, res, next) => {

        if (!roles.includes(req.user.role.role)) {
            return res.status(403).json({
                msg: 'No tienes permiso para acceder a esta app',
            });
        }
        next();
    };
};

module.exports = { allowRoles };
