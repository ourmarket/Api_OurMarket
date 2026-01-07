const { model, Schema } = require('mongoose');

/**
 * Warehouse
 * ---------
 * Representa un depósito físico o lógico.
 */
const WarehouseSchema = new Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},

		name: {
			type: String,
			required: true,
		},

		type: {
			type: String,
			enum: ['MAIN', 'STORE', 'VIRTUAL'],
			default: 'MAIN',
		},

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},

		state: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true }
);

module.exports = model('Warehouse', WarehouseSchema);
