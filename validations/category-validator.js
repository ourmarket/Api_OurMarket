const { check } = require('express-validator');
const { existCategoryById } = require('../helpers');
const { validateFields } = require('../middlewares');
const { hasRole } = require('../middlewares/hasRole');

const getCategoryValidation = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existCategoryById),
	validateFields,
];
const postCategoryValidation = [

	check('name', 'El nombre es obligatorio').not().isEmpty(),
	validateFields,
];

const putCategoryValidation = [

	check('name', 'El nombre es obligatorio').not().isEmpty(),
	check('id').custom(existCategoryById),
	validateFields,
];

const deleteCategoryValidation = [

	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existCategoryById),
	validateFields,
];

module.exports = {
	getCategoryValidation,
	postCategoryValidation,
	putCategoryValidation,
	deleteCategoryValidation,
};
