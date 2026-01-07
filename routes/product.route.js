const {
	getProductValidator,
	postProductValidator,
	deleteProductValidator,
	putProductValidator,
} = require('../validations/product-validator');

const { Router } = require('express');
const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');
const {
	getProducts,
	getProduct,
	postProduct,
	putProduct,
	deleteProduct,
	getProductHistory,
	reportTotalIndividualProduct,
	reportTotalIndividualProductLast30days,
} = require('../controllers/product.controller');

const router = Router();

router.get('/', getProducts);
router.get(
	'/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	getProductValidator,
	getProduct
);
router.get(
	'/:id/history',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	getProductHistory
);

router.post(
	'/',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	postProductValidator,
	postProduct
);
router.put(
	'/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	putProductValidator,
	putProduct
);

router.delete(
	'/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	deleteProductValidator,
	deleteProduct
);

router.get(
	'/products-total-by-id/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	reportTotalIndividualProduct
);

router.get(
	'/totalIndividualProductLast30days/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	reportTotalIndividualProductLast30days
);

module.exports = router;
