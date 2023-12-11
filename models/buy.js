const { Schema, model } = require('mongoose');

const BuySchema = Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: 'User' },
		supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
		quantityProducts: { type: Number },
		total: { type: Number },

		payment: {
			cash: { type: Number, default: 0 },
			transfer: { type: Number, default: 0 },
			debt: { type: Number, default: 0 },
		},

		products: [
			{
				productId: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
					required: true,
				},
				name: { type: String },

				quantity: { type: Number },
				unitCost: { type: Number },
				totalCost: { type: Number },
			},
		],

		state: { type: Boolean, default: true, required: true },

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

BuySchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('Buy', BuySchema);
