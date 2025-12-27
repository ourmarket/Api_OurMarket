/**
 * GOODS RECEIPT (Recepción de Mercadería)
 * --------------------------------------
 * Representa la RECEPCIÓN FÍSICA de productos.
 *
 * RESPONSABILIDADES:
 * - Registrar lo que efectivamente llegó
 * - Impactar stock (+quantity)
 * - Permitir recepciones parciales
 *
 * REGLAS:
 * 1) NO define costos finales
 * 2) NO genera deuda
 * 3) Puede existir sin factura (Buy)
 * 4) Por cada item se genera StockMovement (+)
 */
const { Schema, model } = require('mongoose');
const GoodsReceiptSchema = new Schema(
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

				quantityReceived: {
					type: Number,
					required: true,
					min: 1,
				},
			},
		],

		receivedAt: {
			type: Date,
			default: Date.now,
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

module.exports = model('GoodsReceipt', GoodsReceiptSchema);
