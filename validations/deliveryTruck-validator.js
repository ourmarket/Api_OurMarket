const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existDeliveryTruckById, existUserById } = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getDeliveryTruckValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existDeliveryTruckById),
	validateFields,
];
const getUserDeliveryTruckValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existUserById),
	validateFields,
];
const postDeliveryTruckValidator = [
	check('patent', 'La patente es obligatoria').not().isEmpty(),
	check('maximumLoad', 'La carga maxima es obligatoria').not().isEmpty(),
	check('coldChamber', 'Si posee cámara de frio es obligatorio')
		.not()
		.isEmpty(),
	validateFields,
];
const putDeliveryTruckValidator = [
	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existDeliveryTruckById),
	validateFields,
];
const deleteDeliveryTruckValidator = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existDeliveryTruckById),
	validateFields,
];

module.exports = {
	getDeliveryTruckValidator,
	postDeliveryTruckValidator,
	putDeliveryTruckValidator,
	deleteDeliveryTruckValidator,
	getUserDeliveryTruckValidator,
};
