const { Schema, model } = require('mongoose');

const ProductionCostSnapshotSchema = new Schema(
	{
		manufacturingOrder: {
			type: Schema.Types.ObjectId,
			ref: 'ManufacturingOrder',
			required: true,
			index: true,
		},

		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},

		quantity: Number,
		unitCost: Number,
		totalCost: Number,

		type: {
			type: String,
			enum: ['INPUT', 'OUTPUT'],
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

module.exports = model('ProductionCostSnapshot', ProductionCostSnapshotSchema);
