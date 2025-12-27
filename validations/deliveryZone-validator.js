const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existDeliveryZoneById } = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getDeliveryZoneValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existDeliveryZoneById),
	validateFields,
];
const postDeliveryZoneValidator = [
	check('name', 'El nombre es obligatorio').not().isEmpty(),
	check('cost', 'El costo es obligatorio').not().isEmpty(),
	check('province', 'La provincia  es obligatoria').not().isEmpty(),
	check('city', 'La ciudad es obligatoria').not().isEmpty(),
	check('zip', 'El código postal es obligatorio').not().isEmpty(),
	validateFields,
];
const putDeliveryZoneValidator = [
	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existDeliveryZoneById),
	validateFields,
];
const deleteDeliveryZoneValidator = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existDeliveryZoneById),
	validateFields,
];

module.exports = {
	getDeliveryZoneValidator,
	postDeliveryZoneValidator,
	putDeliveryZoneValidator,
	deleteDeliveryZoneValidator,
};
