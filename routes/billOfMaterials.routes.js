const express = require('express');
const router = express.Router();
const BomController = require('../controllers/billOfMaterials.controller');

// Important: Specific routes before parameter routes
router.get('/active', BomController.getActiveRecipes);

router.post('/', BomController.create);
router.get('/', BomController.getList);
router.get('/:id', BomController.getById);
router.put('/:id', BomController.update);
router.patch('/:id/toggle-active', BomController.toggleActive);
router.delete('/:id', BomController.deleteBom);

module.exports = router;
