const { check } = require('express-validator');
const { existRoleById } = require('../helpers');
const { validateFields } = require('../middlewares');
const { hasRole } = require('../middlewares/hasRole');

const getRolesValidation = [hasRole('ADMIN_ROLE'), validateFields];
const getRoleValidation = [

	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existRoleById),
	validateFields,
];
const postRoleValidation = [

	hasRole('ADMIN_ROLE'),
	check('role', 'El rol es obligatorio').not().isEmpty(),
	validateFields,
];

const putRoleValidation = [

	hasRole('ADMIN_ROLE'),
	check('role', 'El rol es obligatorio').not().isEmpty(),
	check('id').custom(existRoleById),
	validateFields,
];

const deleteRoleValidation = [

	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existRoleById),
	validateFields,
];

module.exports = {
	getRoleValidation,
	postRoleValidation,
	putRoleValidation,
	deleteRoleValidation,
	getRolesValidation,
};
