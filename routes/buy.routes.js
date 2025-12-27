// routes/buy.routes.js

const express = require('express');
const router = express.Router();

const BuyController = require('../controllers/buy.controller');
const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');

/**
 * =========================
 * BUYS (Compras / Deudas)
 * =========================
 */

/**
 * Crear Buy
 * - Registra una compra / factura
 * - NO registra pagos
 */
router.post(
	'/',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	BuyController.createBuy
);

/**
 * Registrar pago (parcial o total)
 */
router.post(
	'/:id/payments',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	BuyController.registerPayment
);

/**
 * Listado de compras
 * Filtros por query:
 * - supplier
 * - status
 * - purchaseOrder
 */
router.get(
	'/',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	BuyController.getBuys
);

/**
 * Listado de pagos
 */
router.get(
	'/payments',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	BuyController.getPayments
);
router.get(
	'/payments/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	BuyController.getPaymentById
);
router.get(
	'/pending',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	BuyController.getPendingBuys
);
/**
 * Detalle de compra
 * Incluye pagos
 */
router.get(
	'/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	BuyController.getBuyById
);

module.exports = router;
