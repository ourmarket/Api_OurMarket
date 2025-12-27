const { Schema, model } = require('mongoose');

const DailySalesSummarySchema = new Schema(
	{
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
			index: true,
		},

		/**
		 * Día lógico
		 */
		date: {
			type: Date,
			required: true,
			index: true,
		},

		/**
		 * Pagos
		 */
		cashTotal: { type: Number, default: 0 },
		transferTotal: { type: Number, default: 0 },
		debtTotal: { type: Number, default: 0 },
		totalPayment: { type: Number, default: 0 },

		/**
		 * Ventas / costos / ganancias
		 */
		totalSell: { type: Number, default: 0 },
		totalCost: { type: Number, default: 0 },
		totalProfits: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

// 1 doc por día por comercio
DailySalesSummarySchema.index({ superUser: 1, date: 1 }, { unique: true });

module.exports = model('DailySalesSummary', DailySalesSummarySchema);

// Cuando se acualiza una Sale

/* async function updateDailySalesSummary(sale) {
  const day = new Date(sale.saleDate);
  day.setHours(0, 0, 0, 0);

  const cash = sale.payment.cash || 0;
  const transfer = sale.payment.transfer || 0;
  const debt = sale.payment.debt || 0;

  await DailySalesSummary.updateOne(
    {
      superUser: sale.superUser,
      date: day,
    },
    {
      $inc: {
        cashTotal: cash,
        transferTotal: transfer,
        debtTotal: debt,
        totalPayment: cash + transfer + debt,

        totalSell: sale.totals.amount,
        totalCost: sale.totals.cost,
        totalProfits: sale.totals.profit,
      },
    },
    { upsert: true }
  );
}
 */
