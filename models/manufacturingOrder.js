const { Schema, model } = require('mongoose');

const ManufacturingOrderSchema = new Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},

		status: {
			type: String,
			enum: ['DRAFT', 'EXECUTED', 'CLOSED', 'CANCELLED'],
			default: 'DRAFT',
			index: true,
		},

		/**
		 * INSUMOS CONSUMIDOS
		 */
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

				unitCost: {
					type: Number,
					default: null, // se toma del stock al consumir
				},

				type: {
					type: String,
					enum: ['MAIN', 'AUX'],
					default: 'MAIN',
					index: true,
				},
			},
		],

		/**
		 * PRODUCTOS GENERADOS
		 */
		outputs: [
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

				expectedQuantity: {
					type: Number,
					default: null,
				},

				costPercent: {
					type: Number,
					default: null, // 0-100
				},

				unitCost: {
					type: Number,
					default: null, // calculado al cerrar la orden
				},
			},
		],

		/**
		 * COSTOS CALCULADOS
		 */
		totalInputCost: {
			type: Number,
			default: 0,
		},

		totalAuxCost: {
			type: Number,
			default: 0,
		},

		totalCost: {
			type: Number,
			default: 0,
		},

		notes: String,

		producedAt: {
			type: Date,
			default: Date.now,
			index: true,
		},

		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
			index: true,
		},

		state: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true }
);

module.exports = model('ManufacturingOrder', ManufacturingOrderSchema);
