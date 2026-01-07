/**
 * Stock
 * -----
 * Snapshot del estado actual del stock por producto.
 * Derivado EXCLUSIVAMENTE de StockMovement.
 */

const { Schema, model } = require('mongoose');

const StockSchema = new Schema(
	{
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
			unique: true,
			index: true,
		},

		quantityAvailable: {
			type: Number,
			required: true,
			default: 0,
		},

		quantityReserved: {
			type: Number,
			required: true,
			default: 0,
		},

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
			index: true,
		},
	},
	{ timestamps: true }
);

module.exports = model('Stock', StockSchema);

/* const { Schema, model } = require('mongoose');

const StockSchema = Schema(
	{
		stockId: { type: String },
		buy: { type: Schema.Types.ObjectId, ref: 'Buy' },
		product: { type: Schema.Types.ObjectId, ref: 'ProductLegacy', required: true },
		quantity: { type: Number },
		cost: { type: Number },
		unityCost: { type: Number },
		stock: { type: Number },
		createdStock: { type: Date },
		updateStock: { type: Date },
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
		state: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

StockSchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('Stock', StockSchema); */
