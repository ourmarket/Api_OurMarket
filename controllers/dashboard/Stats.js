const { response } = require('express');
const { Sale } = require('../../models');
const { logger } = require('../../helpers/logger');
const { ObjectId } = require('mongodb');

const salesTotalReport = async (req, res = response) => {
	try {
		const report = await Sale.aggregate([
			{
				$match: {
					//state: true,
					superUser: new ObjectId(req.tenant._id),
				},
			},
			{
				$group: {
					_id: {},
					totalSales: {
						$sum: '$totals.amount',
					},
					totalCash: {
						$sum: '$payment.cash',
					},
					totalTransfer: {
						$sum: '$payment.transfer',
					},
					totalDebt: {
						$sum: '$payment.debt',
					},
				},
			},
			{
				$project: {
					_id: 0,
					totalSales: 1,
					totalCash: 1,
					totalTransfer: 1,
					totalDebt: 1,
				},
			},
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				report,
			},
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

module.exports = {
	salesTotalReport,
};
