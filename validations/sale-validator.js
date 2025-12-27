const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const {
	existSaleById,
	existClientById,
	existDeliveryTruckById,
	existOrderById,
} = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getSaleValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existSaleById),
	validateFields,
];
const postSaleValidator = [
	check('clientId', 'No es un id de Mongo válido').isMongoId(),
	check('clientId').custom(existClientById),
	check('deliveryTruckId', 'No es un id de Mongo válido').isMongoId(),
	check('deliveryTruckId').custom(existDeliveryTruckById),
	check('orderId', 'No es un id de Mongo válido').isMongoId(),
	check('orderId').custom(existOrderById),

	check('commissionDeliveryTruck', 'La comisión es obligatorio')
		.not()
		.isEmpty(),
	check('totalCost', 'El costo total es obligatorio').not().isEmpty(),
	check('totalSale', 'El total de la venta es obligatorio').not().isEmpty(),
	check('profit', 'La ganancia es obligatoria').not().isEmpty(),
	validateFields,
];
const putSaleValidator = [
	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existSaleById),
	validateFields,
];
const deleteSaleValidator = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existSaleById),
	validateFields,
];

module.exports = {
	getSaleValidator,
	postSaleValidator,
	putSaleValidator,
	deleteSaleValidator,
};
