/**
 * SALE
 * ----
 * Hecho CONTABLE e INMUTABLE.
 *
 * REGLAS FUNDAMENTALES:
 *
 * 1) Sale SI descuenta stock.
 *    - Cada item genera un StockMovement OUT.
 *
 * 2) Sale es INMUTABLE.
 *    - No se edita.
 *    - Correcciones = nueva venta o movimiento compensatorio.
 *
 * 3) Los precios y costos son snapshots.
 *    - Cambios en Product o Stock NO afectan ventas pasadas.
 *
 * 4) Sale es la fuente de:
 *    - Reportes
 *    - Ganancias
 *    - Caja
 *    - Estadísticas
 *
 * 5) Sale puede existir sin Order.
 *    - Venta directa por caja.
 *
 * 6) Paid solo indica estado de pago.
 *    - No afecta stock ni totales.
 */

const { Schema, model } = require('mongoose');

const SaleSchema = new Schema(
	{
		legacyOrderId: {
			type: Schema.Types.ObjectId,
			index: true,
		},

		legacySource: {
			type: String,
		},

		/**
		 * Orden que origina la venta
		 * (opcional: puede haber ventas directas)
		 */
		order: {
			type: Schema.Types.ObjectId,
			ref: 'Order',
			index: true,
		},

		/**
		 * Usuario que concreta la venta
		 */
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},

		/**
		 * Cliente
		 */
		customer: {
			type: Schema.Types.ObjectId,
			ref: 'Customer',
		},

		/**
		 * Detalle vendido
		 * Snapshot TOTAL (histórico)
		 */
		items: [
			{
				product: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
					required: true,
				},

				name: String,
				img: String,

				quantity: {
					type: Number,
					required: true,
				},

				unitPrice: {
					type: Number,
					required: true,
				},

				/**
				 * Costo unitario promedio
				 * calculado al momento de la venta
				 */
				unitCost: {
					type: Number,
					required: true,
				},

				total: {
					type: Number,
					required: true,
				},

				totalCost: {
					type: Number,
					required: true,
				},
			},
		],

		/**
		 * Totales finales
		 */
		totals: {
			quantity: {
				type: Number,
				required: true,
			},
			amount: {
				type: Number,
				required: true,
			},
			cost: {
				type: Number,
				required: true,
			},
			profit: {
				type: Number,
				required: true,
			},
		},

		/**
		 * Pagos reales
		 */
		payment: {
			cash: { type: Number, default: 0 },
			transfer: { type: Number, default: 0 },
			debt: { type: Number, default: 0 },
		},

		/**
		 * Estado contable
		 */
		paid: {
			type: Boolean,
			default: false,
			index: true,
		},

		/**
		 * Fecha real de venta
		 */
		saleDate: {
			type: Date,
			default: Date.now,
			index: true,
		},

		/**
		 * Comercio / dueño
		 */
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

module.exports = model('Sale', SaleSchema);
