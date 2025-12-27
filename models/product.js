const { Schema, model } = require('mongoose');

const ProductSchema = new Schema(
	{
		legacyProductId: {
			type: Schema.Types.ObjectId,
			ref: 'ProductLegacy',
			index: true,
			unique: true,
		},

		legacySource: {
			type: String,
			default: 'ProductV1',
		},

		/* =========================
		 * DATOS DE CATÁLOGO
		 * ========================= */
		name: {
			type: String,
			required: true,
			index: true,
		},

		brand: String,

		unit: String, // kg, unidad, pack, etc

		type: String, // opcional (simple / combo / servicio)

		description: String,

		img: {
			type: String,
			default:
				'https://ik.imagekit.io/mrprwema7/No_image_available.svg_f8oa-E8hq.png',
		},

		category: {
			type: Schema.Types.ObjectId,
			ref: 'Category',
			index: true,
		},

		/* =========================
		 * DISPONIBILIDAD
		 * ========================= */
		available: {
			type: Boolean,
			default: true,
			index: true,
		},

		state: {
			type: Boolean,
			default: true,
			index: true,
		},

		/* =========================
		 * PRECIOS (ex Ofert)
		 * ========================= */

		/**
		 * Precio base de venta al público
		 */
		price: {
			type: Number,
			min: 0,
			default: null,
		},

		/**
		 * Indica si el producto está en oferta
		 */
		hasOffer: {
			type: Boolean,
			default: false,
			index: true,
		},

		/**
		 * Precio de oferta (opcional)
		 */
		offerPrice: {
			type: Number,
			min: 0,
			default: null,
		},

		/**
		 * Vigencia opcional de la oferta
		 */
		offerFrom: Date,
		offerTo: Date,

		/**
		 * Si va al slider de destacados
		 */
		isFeatured: {
			type: Boolean,
			default: false,
		},

		/* =========================
		 * STOCK
		 * ========================= */

		/**
		 * Stock físico DISPONIBLE en depósito
		 * NO incluye reservado ni vendido
		 */
		stockAvailable: {
			type: Number,
			default: 0,
			index: true,
		},

		/* =========================
		 * AUDITORÍA
		 * ========================= */
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		lastUpdatedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
			index: true,
		},
		state: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

/* =========================
 * MÉTODOS
 * ========================= */

/**
 * Devuelve el precio actual correcto
 * (oferta si aplica, sino precio base)
 */
ProductSchema.methods.getCurrentPrice = function () {
	const now = new Date();

	if (
		this.hasOffer &&
		this.offerPrice != null &&
		(!this.offerFrom || this.offerFrom <= now) &&
		(!this.offerTo || this.offerTo >= now)
	) {
		return this.offerPrice;
	}

	return this.price;
};

ProductSchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('Product', ProductSchema);
