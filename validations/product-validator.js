const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existProductById, existCategoryById } = require('../helpers');


/* =========================
 * GET
 * ========================= */
const getProductValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existProductById),
	validateFields,
];

/* =========================
 * POST (CREATE)
 * ========================= */
const postProductValidator = [
	check('name', 'El nombre es obligatorio').notEmpty(),

	// Opcionales según modelo
	check('brand').optional().isString(),
	check('unit').optional().isString(),
	check('type').optional().isString(),
	check('description').optional().isString(),

	// Category
	check('category', 'No es un id de Mongo válido').isMongoId(),
	check('category').custom(existCategoryById),

	// Price (required)
	check('price', 'El precio es obligatorio').notEmpty(),
	check('price', 'El precio debe ser numérico').isFloat({ min: 0 }),

	// Offer
	check('hasOffer').optional().isBoolean(),

	check('offerPrice')
		.optional({ nullable: true })
		.isFloat({ min: 0 })
		.custom((value, { req }) => {
			if (req.body.hasOffer && value == null) {
				throw new Error('El precio de oferta es obligatorio');
			}
			return true;
		}),

	validateFields,
];

/* =========================
 * PUT (UPDATE)
 * ========================= */
const putProductValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existProductById),

	// Todos opcionales en update
	check('name').optional().notEmpty(),
	check('brand').optional().isString(),
	check('unit').optional().isString(),
	check('type').optional().isString(),
	check('description').optional().isString(),

	check('category').optional().isMongoId(),
	check('category').optional().custom(existCategoryById),

	check('price').optional().isFloat({ min: 0 }),
	check('hasOffer').optional().isBoolean(),
	check('offerPrice').optional({ nullable: true }).isFloat({ min: 0 }),

	validateFields,
];

/* =========================
 * DELETE
 * ========================= */
const deleteProductValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existProductById),

	validateFields,
];

module.exports = {
	getProductValidator,
	postProductValidator,
	putProductValidator,
	deleteProductValidator,
};
