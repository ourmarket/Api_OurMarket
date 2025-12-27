const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existOfertById } = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getOfertValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existOfertById),
	validateFields,
];
const postOfertValidator = [
	check('product', 'No es un id de Mongo válido').isMongoId(),
	check('description', 'La descripción es obligatoria').not().isEmpty(),
	validateFields,
];
const putOfertValidator = [
	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existOfertById),
	validateFields,
];
const deleteOfertValidator = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existOfertById),
	validateFields,
];

module.exports = {
	getOfertValidator,
	postOfertValidator,
	putOfertValidator,
	deleteOfertValidator,
};
