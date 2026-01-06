/**
 * GOODS RECEIPT (Recepción de Mercadería)
 * --------------------------------------
 * Representa el INGRESO FÍSICO de productos para una COMPRA.
 *
 * CONCEPTO CLAVE:
 * - La recepción NO es contable
 * - La recepción NO define costos
 * - La recepción NO genera deuda
 *
 * RESPONSABILIDADES:
 * - Registrar qué productos y cantidades llegaron
 * - Permitir recepciones parciales o múltiples
 * - Impactar stock (+quantity)
 * - Servir como respaldo operativo / logístico
 *
 * REGLAS DE NEGOCIO:
 * 1) Siempre está asociada a una Buy (Compra)
 * 2) NO modifica la Buy ni sus totales
 * 3) NO modifica pagos
 * 4) Puede haber múltiples recepciones por Buy
 * 5) Cada ítem genera movimientos de stock (+)
 * 6) Es un documento histórico (no editable)
 */

const { Schema, model } = require('mongoose');

const GoodsReceiptSchema = new Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			index: true,
			// Ej: GR-000123
		},

		/**
		 * COMPRA asociada
		 * ----------------
		 * Punto central del flujo:
		 * La recepción se hace SOBRE la compra real,
		 * no sobre la orden de compra.
		 */
		buyId: {
			type: Schema.Types.ObjectId,
			ref: 'Buy',
			required: true,
			index: true,
		},

		/**
		 * Proveedor
		 * ----------
		 * Snapshot relacional.
		 * Debe coincidir con buy.supplier
		 */
		supplier: {
			type: Schema.Types.ObjectId,
			ref: 'Supplier',
			required: true,
		},

		/**
		 * Ítems recibidos
		 * ----------------
		 * NO define precios.
		 * SOLO cantidades efectivamente recibidas.
		 */
		generalObservations: {
			type: String,
			default: '',
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

				observations: {
					type: String,
					default: '',
				},
			},
		],

		/**
		 * Fecha efectiva de recepción
		 * -----------------------------
		 * Puede diferir de createdAt
		 */
		receivedAt: {
			type: Date,
			default: Date.now,
		},

		/**
		 * Usuario que registra la recepción
		 */
		receivedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},

		/**
		 * Tenant / SuperUser
		 */
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
			index: true,
		},

		/**
		 * Soft delete
		 */
		state: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = model('GoodsReceipt', GoodsReceiptSchema);
