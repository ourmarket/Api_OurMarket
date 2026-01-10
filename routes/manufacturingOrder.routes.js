const express = require('express');
const router = express.Router();
const MoController = require('../controllers/manufacturingOrder.controller');

router.post('/', MoController.createOrder);
router.get('/', MoController.getList);
router.get('/:id', MoController.getOrderById); // Corrigido de getById a getOrderById
router.post('/:id/execute', MoController.executeOrder);
router.post('/:id/close', MoController.closeOrder);
router.get('/:id/cost-snapshot', MoController.getCostSnapshot);

module.exports = router;
