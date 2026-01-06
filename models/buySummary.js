const { Schema, model } = require('mongoose');

const BuySummarySchema = new Schema(
	{
		month: { type: Number, required: true },
		year: { type: Number, required: true },
		totalAmount: { type: Number, default: 0 },
		count: { type: Number, default: 0 },
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

// Aseguramos que solo haya un resumen por mes/año/sucursal
BuySummarySchema.index({ month: 1, year: 1, superUser: 1 }, { unique: true });

module.exports = model('BuySummary', BuySummarySchema);
