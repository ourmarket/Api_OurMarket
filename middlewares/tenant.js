const { resolveTenant } = require("../helpers/resolveTenant");
const { SuperUser } = require("../models");

const tenantMiddleware = async (req, res, next) => {
  try {
    const tenant = resolveTenant(req)

    if (!tenant) {
      return res.status(400).json({
        ok: false,
        msg: "Tenant no especificado",
      });
    }

    const superUser = await SuperUser.findOne({
      clientId: tenant,
      state: true,
    });

    if (!superUser) {
      return res.status(404).json({
        ok: false,
        msg: "Tenant inválido",
      });
    }

    req.tenant = superUser;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  tenantMiddleware,
};
