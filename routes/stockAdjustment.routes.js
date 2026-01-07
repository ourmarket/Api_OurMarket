const express = require('express');
const router = express.Router();
const StockAdjustmentController = require('../controllers/stockAdjustment.controller');
const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');

router.use(allowApp(['dashboard']));
router.use(allowRoles('ADMIN_ROLE'));

/**
 * POST /api/stock-adjustments
 * Crear ajuste manual de stock
 */
router.post('/', StockAdjustmentController.createAdjustment);

module.exports = router;
