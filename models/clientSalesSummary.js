const { Schema, model } = require('mongoose');

const ClientSalesSummarySchema = new Schema(
	{
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
			index: true,
		},
		client: {
			type: Schema.Types.ObjectId,
			ref: 'Client',
			required: true,
		},

		active: {
			type: Boolean,
			index: true,
		},

		totalBuy: {
			type: Number,
			default: 0,
		},
		totalCost: {
			type: Number,
			default: 0,
		},
		totalProfits: {
			type: Number,
			default: 0,
		},

		ordersCount: {
			type: Number,
			default: 0,
		},

		payment: {
			cash: { type: Number, default: 0 },
			transfer: { type: Number, default: 0 },
			debt: { type: Number, default: 0 },
		},

		firstSaleAt: Date,
		lastSaleAt: Date,

		updatedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{
		collection: 'client_sales_summary',
	}
);

ClientSalesSummarySchema.index({ superUser: 1, client: 1 }, { unique: true });

ClientSalesSummarySchema.index({ superUser: 1, active: 1, totalBuy: -1 });

module.exports = model('ClientSalesSummary', ClientSalesSummarySchema);

//Middleware de actualización incremental (día a día)

//Cuando creás una venta nueva:
/* await ClientSalesSummary.updateOne(
  { superUser, client: sale.customer },
  {
    $inc: {
      totalBuy: sale.totals.amount,
      totalCost: sale.totals.cost,
      totalProfits: sale.totals.profit,
      ordersCount: 1,

      'payment.cash': sale.payment.cash,
      'payment.transfer': sale.payment.transfer,
      'payment.debt': sale.payment.debt,
    },
    $set: {
      active: customer.active,
      lastSaleAt: sale.saleDate,
      updatedAt: new Date(),
    },
    $setOnInsert: {
      firstSaleAt: sale.saleDate,
    },
  },
  { upsert: true }
);

 */

//¿Y si se anula una venta?
/* $inc: {
  totalBuy: -sale.totals.amount,
  totalCost: -sale.totals.cost,
  totalProfits: -sale.totals.profit,
  ordersCount: -1,

  'payment.cash': -sale.payment.cash,
  'payment.transfer': -sale.payment.transfer,
  'payment.debt': -sale.payment.debt,
} */
