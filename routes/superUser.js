const { Router } = require('express');
const {
	getSuperUsers,
	getSuperUser,
	postSuperUser,
	putSuperUser,
	deleteSuperUser,
} = require('../controllers/superUser');

const router = Router();

/**
 * {{url}}/api/superUser
 */

//  Obtener todas las categorías - publico
router.get('/', getSuperUsers);
// router.get('/update', update);

// Obtener una categoría por id - publico
router.get('/:id', getSuperUser);

// Crear categoría - privado - cualquier persona con un token válido
router.post('/', postSuperUser);

// Actualizar - privado - cualquiera con token válido
router.put('/:id', putSuperUser);

// Borrar una categoría - Admin
router.delete('/:id', deleteSuperUser);

module.exports = router;

/* 
TODO Agregar validaciones y permisos
*/
