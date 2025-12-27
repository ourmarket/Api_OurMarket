const allowedApps = ['dashboard', 'tpv', 'reparto'];

const appMiddleware = (req, res, next) => {
  const app = req.headers['x-app-id'];


  if (!app || !allowedApps.includes(app)) {
    return res.status(400).json({
      ok: false,
      msg: 'App inválida',
    });
  }

  req.appId = app;
  next();
};

module.exports = { appMiddleware };
