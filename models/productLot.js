const { Schema, model } = require('mongoose');

const ProductLotSchema = Schema(
	{
		product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
		supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
		quantity: { type: Number },
		cost: { type: Number },
		stock: { type: Number },
		location: { type: String },
		moveDate: { type: Date },

		state: { type: Boolean, default: true, required: true },

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

ProductLotSchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('ProductLot', ProductLotSchema);
