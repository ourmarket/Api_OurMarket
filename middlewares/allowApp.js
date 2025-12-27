const { resolveApp } = require("../helpers/resolveApp");

const allowApp = (apps) => {

    return (req, res, next) => {
        const app = resolveApp(req);
        if (!apps.includes(app)) {
            return res.status(403).json({
                msg: 'App no permitida',
            });
        }
        next();
    };
};

module.exports = { allowApp };
