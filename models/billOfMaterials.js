const { model, Schema } = require('mongoose');

const BillOfMaterialsSchema = new Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
		},
		name: {
			type: String,
			required: true,
		},
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
			// unique: true, // Allow multiple recipes (variants) for same product if needed, though typically 1 active.
		},

		inputs: [
			{
				product: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
					required: true,
				},
				quantity: {
					type: Number,
					required: true,
					min: 0.0001,
				},
			},
		],

		// Nuevo modelo: Múltiples Outputs (Destace / Transformación)
		outputs: [
			{
				product: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
				},
				expectedQuantity: {
					type: Number,
					default: null,
				},
				costPercent: {
					type: Number,
					default: null, // 0-100
				},
			},
		],

		yieldQuantity: {
			type: Number,
			default: 1, // unidades producidas
		},

		notes: String,

		isActive: {
			type: Boolean,
			default: true,
		},

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

module.exports = model('BillOfMaterials', BillOfMaterialsSchema);
