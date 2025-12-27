const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const {
	existClientById,
	existUserById,
	existClientCategoryById,
	existClientTypeById,
} = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getClientValidator = [

	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existClientById),
	validateFields,
];
const getClientUserValidator = [

	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existUserById),
	validateFields,
];
const postClientValidator = [
	check('user', 'No es un id de Mongo válido').isMongoId(),
	check('user').custom(existUserById),
	check('clientCategory', 'No es un id de Mongo válido').isMongoId(),
	check('clientCategory').custom(existClientCategoryById),
	check('clientType', 'No es un id de Mongo válido').isMongoId(),
	check('clientType').custom(existClientTypeById),

	validateFields,
];
const putClientValidator = [

	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existClientById),
	validateFields,
];
const deleteClientValidator = [

	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existClientById),
	validateFields,
];

module.exports = {
	getClientValidator,
	postClientValidator,
	putClientValidator,
	deleteClientValidator,
	getClientUserValidator,
};
