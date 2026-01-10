const { Schema, model } = require('mongoose');

const ProductLotSchema = Schema(
	{
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
			index: true,
		},

		// Origin Details
		type: {
			type: String,
			enum: ['BUY', 'MANUFACTURE', 'ADJUSTMENT', 'INITIAL'],
			required: true,
			default: 'BUY',
		},
		reference: { type: Schema.Types.ObjectId, index: true }, // ID of Buy, ManufacturingOrder, etc.

		// Optional Supplier (only for BUY)
		supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },

		// Quantities
		initialQuantity: { type: Number, required: true },
		currentQuantity: { type: Number, required: true, min: 0 }, // Available for FIFO

		// Costs
		unitCost: { type: Number, required: true }, // Cost per unit at creation

		location: { type: String },

		state: { type: Boolean, default: true, required: true }, // False if depleted?

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
			index: true,
		},
	},
	{ timestamps: true }
);

// Virtual for backward compatibility if needed, or helper
ProductLotSchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

// Index for FIFO: Product + CreatedAt
ProductLotSchema.index({ product: 1, createdAt: 1 });
ProductLotSchema.index({ product: 1, currentQuantity: 1 }); // To find available lots

module.exports = model('ProductLot', ProductLotSchema);
