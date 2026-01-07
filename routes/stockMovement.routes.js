const express = require('express');
const router = express.Router();
const StockMovementController = require('../controllers/stockMovement.controller');
const { allowApp } = require('../middlewares/allowApp');

router.use(allowApp(['dashboard']));

/**
 * GET /api/stock-movements
 * Historial de movimientos
 */
router.get('/', StockMovementController.getStockMovements);

module.exports = router;
