const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existBuyById } = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getBuysValidator = [validateFields];
const getBuyValidator = [

	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existBuyById),
	validateFields,
];
const postBuyValidator = [

	check('supplier', 'No es un id de Mongo válido').isMongoId(),
	check('quantityProducts', 'quantityProducts es obligatoria').not().isEmpty(),
	check('total', 'total es obligatoria').not().isEmpty(),
	check('payment', 'payment es obligatoria').not().isEmpty(),
	check('products', 'products es obligatoria').not().isEmpty(),
	validateFields,
];
const putBuyValidator = [

	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existBuyById),
	validateFields,
];
const deleteBuyValidator = [

	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existBuyById),
	validateFields,
];

module.exports = {
	getBuysValidator,
	getBuyValidator,
	postBuyValidator,
	putBuyValidator,
	deleteBuyValidator,
};
