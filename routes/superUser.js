const { Router } = require('express');
const {
	getSuperUsers,
	getSuperUser,
	postSuperUser,
	putSuperUser,
	deleteSuperUser,
} = require('../controllers/superUser');
const { validarJWT, isSuperAdminRole } = require('../middlewares');

const router = Router();

/**
 * {{url}}/api/superUser
 * Todas las rutas de gestión de Tenants (SuperUsers)
 * son privadas y exclusivas para usuarios con rol SUPER_ADMIN_ROLE.
 */
router.use(validarJWT);
router.use(isSuperAdminRole);

// Obtener todos los tenants
router.get('/', getSuperUsers);

// Obtener un tenant por id
router.get('/:id', getSuperUser);

// Crear nuevo tenant con su admin inicial y config
router.post('/', postSuperUser);

// Actualizar datos del tenant
router.put('/:id', putSuperUser);

// Cambiar estado (activar / desactivar)
router.delete('/:id', deleteSuperUser);

module.exports = router;
