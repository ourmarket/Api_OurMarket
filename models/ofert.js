const { Schema, model } = require('mongoose');

const OfertSchema = Schema(
	{
		code: { type: Number },
		product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
		description: { type: String },
		visible: { type: Boolean, default: true },
		ofert: { type: Boolean, default: false },
		state: { type: Boolean, default: true },
		basePrice: { type: Number }, // consumidor final
		retailPrice: { type: Number },
		prices: [
			{
				price1: { type: Number },
				price2: { type: Number },
				price3: { type: Number },
				price4: { type: Number },
			},
		],
		quantities: [
			{
				quantity1: { type: Number },
				quantity2: { type: Number },
				quantity3: { type: Number },
				quantity4: { type: Number },
			},
		],
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

OfertSchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('Ofert', OfertSchema);
