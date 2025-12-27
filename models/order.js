/**
 * ORDER
 * -----
 * Documento OPERATIVO.
 *
 * REGLAS:
 *
 * 1) Order NO descuenta stock.
 *    - El stock se descuenta SOLO al confirmar una venta (Sale).
 *
 * 2) Order NO es una venta.
 *    - Puede cancelarse.
 *    - Puede no pagarse.
 *
 * 3) Los precios se congelan en la orden.
 *    - Cambios en Product.price NO afectan órdenes existentes.
 *
 * 4) Order NO se usa para reportes.
 *    - Los reportes se hacen desde Sale.
 *
 * 5) Una Order CONFIRMED genera:
 *    - Sale
 *    - StockMovement (OUT)
 */

const { Schema, model } = require('mongoose');

const OrderSchema = new Schema(
	{
		/**
		 * Usuario que crea la orden
		 */
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},

		/**
		 * Cliente (opcional)
		 */
		customer: {
			type: Schema.Types.ObjectId,
			ref: 'Customer',
		},

		/**
		 * Estado de la orden
		 */
		status: {
			type: String,
			enum: ['OPEN', 'CONFIRMED', 'CANCELLED'],
			default: 'OPEN',
			index: true,
		},

		orderType: {
			type: String,
			enum: ['LOCAL', 'DELIVERY'],
			required: true,
		},
		orderGenerationType: {
			type: String,
			enum: ['TPV', 'DASHBOARD', 'WEB', 'BOT'],
			required: true,
		},
		deliveryTruck: {
			type: Schema.Types.ObjectId,
			ref: 'DeliveryTruck',
			default: null,
		},
		deliveryZone: { type: Schema.Types.ObjectId, ref: 'DeliveryZone' },
		shippingAddress: { type: Schema.Types.ObjectId, ref: 'ClientAddress' },

		/**
		 * Detalle de productos
		 * Precio congelado al momento de la orden
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
					min: 1,
				},

				/**
				 * Precio unitario aplicado
				 * (no se recalcula jamás)
				 */
				unitPrice: {
					type: Number,
					required: true,
					min: 0,
				},

				total: {
					type: Number,
					required: true,
					min: 0,
				},
			},
		],

		/**
		 * Totales congelados
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
		},

		/**
		 * Super usuario / comercio
		 */
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
			index: true,
		},
	},
	{ timestamps: true }
);

module.exports = model('Order', OrderSchema);
