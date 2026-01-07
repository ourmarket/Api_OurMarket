/**
 * StockMovement
 * -------------
 * Registro INMUTABLE de movimientos de stock.
 *
 * REGLAS:
 * 1) quantity siempre es positiva.
 * 2) El impacto lo define `type`, no quantity.
 * 3) reason explica el origen del movimiento.
 * 4) No se edita ni se borra.
 * 5) Correcciones = movimiento compensatorio.
 */

const { Schema, model } = require('mongoose');

const StockMovementSchema = new Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		meta: {
			migration: { type: Boolean, default: false },
			source: { type: String },
		},

		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
			index: true,
		},

		quantity: {
			type: Number,
			required: true,
			min: 0.0001, // 🔒 nunca cero ni negativa
		},

		type: {
			type: String,
			enum: ['IN', 'OUT', 'RESERVED', 'RELEASED'],
			required: true,
			index: true,
		},

		reason: {
			type: String,
			enum: ['BUY', 'SALE', 'ORDER', 'ADJUST', 'RETURN'],
			required: true,
			index: true,
		},

		reference: {
			type: Schema.Types.ObjectId,
			required: true,
			index: true,
			// Buy._id | Sale._id | Adjustment._id | GoodsReceipt._id
		},

		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

module.exports = model('StockMovement', StockMovementSchema);
