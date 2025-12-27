const { response } = require('express');
const DailySalesSummary = require('../../models/dailySalesSummary');
const { logger } = require('../../helpers/logger');

// Chart 1 - Dashboard
const getPaymentsAndDebtChart = async (req, res = response) => {
	try {
		const superUser = req.tenant._id;
		const days = Number(req.query.days || 14);

		const fromDate = new Date();
		fromDate.setDate(fromDate.getDate() - days);

		const data = await DailySalesSummary.find(
			{
				superUser,
				date: { $gte: fromDate },
			},
			{
				_id: 0,
				date: 1,
				cashTotal: 1,
				transferTotal: 1,
				debtTotal: 1,
				total: '$totalPayment',
			}
		)
			.sort({ date: 1 })
			.lean();

		res.status(200).json({
			ok: true,
			data,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			ok: false,
			msg: error.message,
		});
	}
};

// Chart 2 - Dashboard
const getProfitsChart = async (req, res = response) => {
	try {
		const superUser = req.tenant._id;
		const days = Number(req.query.days || 30);

		const fromDate = new Date();
		fromDate.setDate(fromDate.getDate() - days);

		const data = await DailySalesSummary.find(
			{
				superUser,
				date: { $gte: fromDate },
			},
			{
				_id: 0,
				date: 1,
				totalProfits: 1,
			}
		)
			.sort({ date: 1 })
			.lean();

		res.status(200).json({
			ok: true,
			data,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			ok: false,
			msg: error.message,
		});
	}
};

// chart3 y 4
const getMonthlySalesChart = async (req, res = response) => {
	try {
		const superUser = req.tenant._id;
		const year = Number(req.query.year || new Date().getFullYear());

		const data = await DailySalesSummary.aggregate([
			{
				$match: {
					superUser,
					date: {
						$gte: new Date(`${year}-01-01T00:00:00.000Z`),
						$lte: new Date(`${year}-12-31T23:59:59.999Z`),
					},
				},
			},
			{
				$group: {
					_id: {
						year: { $year: '$date' },
						month: { $month: '$date' },
					},
					totalSell: { $sum: '$totalSell' },
					totalCost: { $sum: '$totalCost' },
					totalProfits: { $sum: '$totalProfits' },
				},
			},
			{
				$project: {
					_id: 0,
					year: '$_id.year',
					month: '$_id.month',
					totalSell: 1,
					totalCost: 1,
					totalProfits: 1,
				},
			},
			{
				$sort: { year: 1, month: 1 },
			},
		]);

		res.status(200).json({
			ok: true,
			data,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			ok: false,
			msg: error.message,
		});
	}
};

module.exports = {
	getPaymentsAndDebtChart,
	getProfitsChart,
	getMonthlySalesChart,
};
