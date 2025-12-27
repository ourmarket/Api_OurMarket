const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existDeliverySubZoneById } = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getDeliverySubZoneValidator = [

	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existDeliverySubZoneById),
	validateFields,
];
const postDeliverySubZoneValidator = [

	check('deliveryZone', 'No es un id de Mongo').isMongoId(),
	check('name', 'El nombre es obligatorio').not().isEmpty(),
	validateFields,
];
const putDeliverySubZoneValidator = [

	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existDeliverySubZoneById),
	check('deliveryZone', 'No es un id de Mongo').isMongoId(),
	validateFields,
];
const deleteDeliverySubZoneValidator = [

	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existDeliverySubZoneById),
	validateFields,
];

module.exports = {
	getDeliverySubZoneValidator,
	postDeliverySubZoneValidator,
	putDeliverySubZoneValidator,
	deleteDeliverySubZoneValidator,
};
