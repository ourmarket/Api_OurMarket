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

/* | Acción              | Cuándo                          |
| ------------------- | ------------------------------- |
| `CREATED`           | Se crea la compra               |
| `GOODS_RECEIVED`    | Se registra una recepción       |
| `PARTIAL_RECEIPT`   | Recepción parcial               |
| `PAYMENT_ADDED`     | Se registra un pago             |
| `PAYMENT_REMOVED`   | Se elimina un pago              |
| `STATUS_CHANGED`    | Cambio PENDING → PARTIAL → PAID |
| `ADJUSTMENT_LINKED` | Ajuste automático vinculado     |
| `DOCUMENT_ATTACHED` | Factura / remito                |
| `CANCELLED`         | Anulación (si existe)           |
| `NOTE_ADDED`        | Nota manual                     | */

const { Schema, model } = require('mongoose');

const BuyHistorySchema = new Schema(
	{
		action: {
			type: String,
			enum: [
				'CREATED',
				'GOODS_RECEIVED',
				'PARTIAL_RECEIPT',
				'PAYMENT_ADDED',
				'PAYMENT_REMOVED',
				'STATUS_CHANGED',
				'ADJUSTMENT_LINKED',
				'DOCUMENT_ATTACHED',
				'NOTE_ADDED',
				'CANCELLED',
			],
			required: true,
		},

		description: {
			type: String,
			required: true,
		},

		reference: {
			model: {
				type: String,
				enum: ['GoodsReceipt', 'StockMovement', 'Payment', 'Document'],
			},
			id: {
				type: Schema.Types.ObjectId,
			},
		},

		meta: {
			type: Schema.Types.Mixed,
			default: {},
			// Ej:
			// { amount: 1000 }
			// { quantities: [{ product, qty }] }
			// { from: 'PENDING', to: 'PAID' }
		},

		performedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},

		performedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ _id: false }
);

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
			required: false,
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

		history: {
			type: [BuyHistorySchema],
			default: [],
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
