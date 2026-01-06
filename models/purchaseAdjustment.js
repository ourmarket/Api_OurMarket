/**
 * PURCHASE ADJUSTMENT (Ajuste de Compra / Nota de Crédito)
 * --------------------------------------------------------
 * Representa un AJUSTE CONTABLE sobre una Compra ya registrada.
 *
 * OBJETIVO:
 * - Corregir la DEUDA con el proveedor
 * - SIN modificar la compra original
 * - SIN modificar recepciones
 * - SIN modificar pagos ya realizados
 *
 * CASOS DE USO:
 * - Faltante de mercadería
 * - Mercadería dañada
 * - Diferencia de precio
 * - Devoluciones
 * - Bonificaciones posteriores
 *
 * PRINCIPIOS CLAVE:
 * 1) Documento INMUTABLE
 * 2) Impacta SOLO en el saldo pendiente
 * 3) totalAmount SIEMPRE NEGATIVO
 * 4) Nunca edita compras ni recepciones
 * 5) Funciona como NOTA DE CRÉDITO del proveedor
 *
 * IMPORTANTE:
 * El saldo de una compra se calcula como:
 *
 *   saldo = compra.total
 *         - sum(pagos)
 *         + sum(ajustes)   // ajustes son valores negativos
 */

const { Schema, model } = require('mongoose');

const PurchaseAdjustmentSchema = new Schema(
	{
		/**
		 * Código legible por humanos
		 * Ej: AJ-2024-001
		 */
		code: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},

		/**
		 * Tipo de ajuste
		 * Define el motivo principal del crédito
		 */
		type: {
			type: String,
			enum: [
				'SHORTAGE', // faltante
				'DAMAGE', // dañado
				'PRICE', // diferencia de precio
				'RETURN', // devolución
				'BONUS', // bonificación
			],
			required: true,
		},

		/**
		 * Compra a la que ajusta la deuda
		 * NUNCA se modifica la compra
		 */
		buyId: {
			type: Schema.Types.ObjectId,
			ref: 'Buy',
			required: true,
			index: true,
		},

		/**
		 * Proveedor (redundante por trazabilidad histórica)
		 */
		supplier: {
			type: Schema.Types.ObjectId,
			ref: 'Supplier',
			required: true,
		},

		/**
		 * Recepción relacionada (opcional)
		 * Sirve como evidencia del ajuste
		 */
		goodsReceipt: {
			type: Schema.Types.ObjectId,
			ref: 'GoodsReceipt',
		},

		/**
		 * Ítems ajustados (detalle opcional pero recomendado)
		 * NO modifica los ítems originales de la compra
		 */
		items: [
			{
				product: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
					required: true,
				},

				nameSnapshot: String,

				/**
				 * Cantidad afectada (ej: 2 unidades faltantes)
				 */
				quantity: {
					type: Number,
					min: 1,
				},

				/**
				 * Monto unitario del ajuste
				 * (normalmente coincide con unitCost de la compra)
				 */
				unitAmount: {
					type: Number,
					min: 0,
				},

				/**
				 * Total de la línea
				 * SIEMPRE NEGATIVO
				 */
				lineTotal: {
					type: Number,
					required: true,
				},

				/**
				 * Motivo específico del ítem
				 */
				reason: String,
			},
		],

		/**
		 * Total del ajuste
		 * REGLA CRÍTICA:
		 * - Debe ser NEGATIVO
		 * - Nunca puede ser positivo
		 */
		totalAmount: {
			type: Number,
			required: true,
			max: 0,
		},

		/**
		 * Descripción general del ajuste
		 */
		reason: {
			type: String,
		},

		/**
		 * Estado del ajuste
		 * No hay borradores ni edición
		 */
		status: {
			type: String,
			enum: ['CONFIRMED'],
			default: 'CONFIRMED',
		},

		/**
		 * Auditoría
		 */
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

		/**
		 * Soft delete (por consistencia del sistema)
		 * Idealmente NUNCA se usa
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

module.exports = model('PurchaseAdjustment', PurchaseAdjustmentSchema);
