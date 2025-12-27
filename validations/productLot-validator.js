const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existProductLotById } = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getProductLotValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existProductLotById),
	validateFields,
];
const postProductLotValidator = [
	check('product', 'El producto es obligatorio').not().isEmpty(),
	check('supplier', 'El proveedor obligatorio').not().isEmpty(),
	check('quantity', 'La cantidad  es obligatoria').not().isEmpty(),
	check('cost', 'El costo es obligatorio').not().isEmpty(),
	validateFields,
];
const putProductLotValidator = [
	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existProductLotById),
	validateFields,
];
const deleteProductLotValidator = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existProductLotById),
	validateFields,
];

module.exports = {
	getProductLotValidator,
	postProductLotValidator,
	putProductLotValidator,
	deleteProductLotValidator,
};
