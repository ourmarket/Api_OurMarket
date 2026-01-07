const { model, Schema } = require('mongoose');

/**
 * InventoryAdjustment
 * -------------------
 * Documento administrativo que respalda ajustes de stock.
 * NO impacta stock directamente.
 */
const InventoryAdjustmentSchema = new Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
		},

		reason: {
			type: String,
			enum: ['DAMAGE', 'LOSS', 'COUNT_ERROR', 'MIGRATION'],
			required: true,
		},

		observations: String,

		items: [
			{
				product: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
					required: true,
				},
				quantity: {
					type: Number,
					required: true,
				},
				type: {
					type: String,
					enum: ['IN', 'OUT'],
					required: true,
				},
			},
		],

		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

module.exports = model('InventoryAdjustment', InventoryAdjustmentSchema);
