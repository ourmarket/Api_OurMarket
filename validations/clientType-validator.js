const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existClientTypeById } = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getClientTypeValidator = [

	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existClientTypeById),
	validateFields,
];
const postClientTypeValidator = [

	check('clientType', 'El nombre de la categoría es obligatorio')
		.not()
		.isEmpty(),
	validateFields,
];
const putClientTypeValidator = [

	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existClientTypeById),
	validateFields,
];
const deleteClientTypeValidator = [

	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existClientTypeById),
	validateFields,
];

module.exports = {
	getClientTypeValidator,
	postClientTypeValidator,
	putClientTypeValidator,
	deleteClientTypeValidator,
};
