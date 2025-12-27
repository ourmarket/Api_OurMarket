/**
 * BUY (Compra a Proveedor)
 * ------------------------
 * Representa el HECHO ECONÓMICO real.
 *
 * RESPONSABILIDADES:
 * - Registrar costos históricos reales
 * - Generar deuda / pagos
 * - Asociarse opcionalmente a PO / Receipt
 *
 * REGLAS:
 * 1) Items INMUTABLES
 * 2) unitCost histórico, nunca recalculado
 * 3) total cerrado y persistido
 * 4) NO maneja stock directamente
 */
const { Schema, model } = require('mongoose');

const BuySchema = new Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		purchaseOrder: {
			type: Schema.Types.ObjectId,
			ref: 'PurchaseOrder',
		},

		goodsReceipt: {
			type: Schema.Types.ObjectId,
			ref: 'GoodsReceipt',
		},
		documentNumber: {
			type: String,
		},
		date: {
			type: Date,
			default: Date.now,
		},

		supplier: {
			type: Schema.Types.ObjectId,
			ref: 'Supplier',
			required: true,
		},

		items: [
			{
				product: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
					required: true,
				},

				nameSnapshot: String,

				quantity: {
					type: Number,
					required: true,
					min: 1,
				},

				unitCost: {
					type: Number,
					required: true,
					min: 0,
				},
			},
		],

		total: {
			type: Number,
			required: true,
		},

		payments: [
			{
				amount: { type: Number, required: true },
				paymentMethod: {
					type: String,
					enum: ['CASH', 'TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK'],
					required: true,
				},
				reference: String,
				date: { type: Date, default: Date.now },
				createdBy: {
					type: Schema.Types.ObjectId,
					ref: 'User',
					required: true,
				},
			},
		],

		status: {
			type: String,
			enum: ['PENDING', 'PARTIAL', 'PAID'],
			default: 'PENDING',
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
		},

		state: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

module.exports = model('Buy', BuySchema);
