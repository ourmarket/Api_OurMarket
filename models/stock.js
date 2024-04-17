const { Schema, model } = require('mongoose');

const StockSchema = Schema(
	{
		stockId: { type: String },
		buy: { type: Schema.Types.ObjectId, ref: 'Buy' },
		product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
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

module.exports = model('Stock', StockSchema);
