const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existClientCategoryById } = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getClientCategoryValidator = [

	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existClientCategoryById),
	validateFields,
];
const postClientCategoryValidator = [

	check('clientCategory', 'El nombre de la categoría es obligatorio')
		.not()
		.isEmpty(),
	validateFields,
];
const putClientCategoryValidator = [

	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existClientCategoryById),
	validateFields,
];
const deleteClientCategoryValidator = [

	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existClientCategoryById),
	validateFields,
];

module.exports = {
	getClientCategoryValidator,
	postClientCategoryValidator,
	putClientCategoryValidator,
	deleteClientCategoryValidator,
};
