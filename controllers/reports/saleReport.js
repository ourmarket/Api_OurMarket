/* eslint-disable no-dupe-keys */
/* eslint-disable camelcase */
const { response } = require('express');
const { ObjectId } = require('mongodb');
const { logger } = require('../../helpers/logger');
const { Sale } = require('../../models');
const { convertToDate } = require('../../helpers/convertToDate');

//654974527ae94fa111479ad5

const salesPaymentByLastXdayReport = async (req, res = response) => {
	try {
		const { days } = req.query;

		console.log(new Date().setDate(new Date().getDate() - +days));

		const report = await Sale.aggregate([
			{
				$match: {
					//state: true,
					superUser: new ObjectId(req.tenant._id),
					saleDate: {
						$gte: new Date(new Date().setDate(new Date().getDate() - +days)),
					},
				},
			},
			{
				$group: {
					_id: {
						day: {
							$dayOfMonth: '$saleDate',
						},
						month: {
							$month: '$saleDate',
						},
						year: {
							$year: '$saleDate',
						},
					},
					cashTotal: {
						$sum: '$payment.cash',
					},
					transferTotal: {
						$sum: '$payment.transfer',
					},
					debtTotal: {
						$sum: '$payment.debt',
					},
				},
			},
			{
				$project: {
					_id: 0,
					day: {
						$toString: '$_id.day',
					},
					month: {
						$toString: '$_id.month',
					},
					year: {
						$toString: '$_id.year',
					},
					cashTotal: 1,
					transferTotal: 1,
					debtTotal: 1,
				},
			},
			{
				$project: {
					total: { $sum: ['$cashTotal', '$transferTotal', '$debtTotal'] },
					cashTotal: 1,
					transferTotal: 1,
					debtTotal: 1,
					date: {
						$concat: ['$month', '-', '$day', '-', '$year'],
					},
				},
			},
		]);

		const sortReport = report
			.map((report) => ({
				...report,
				date: convertToDate(report.date),
			}))
			.sort(function (a, b) {
				return a.date - b.date;
			});

		res.status(200).json({
			ok: true,
			status: 200,
			days,
			data: {
				report: sortReport,
			},
		});
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const salesTotalProductsReport = async (req, res = response) => {
	try {
		const report = await Sale.aggregate([
			{
				$match: {
					//state: true,
					superUser: new ObjectId(req.tenant._id),
					// opcional: filtro de fechas
					// saleDate: { $gte: from, $lte: to },
				},
			},
			{
				$unwind: '$items',
			},
			{
				$group: {
					_id: '$items.product',
					name: { $first: '$items.name' },
					img: { $first: '$items.img' },

					totalQuantity: { $sum: '$items.quantity' },
					totalAmount: { $sum: '$items.total' },
					totalCost: { $sum: '$items.totalCost' },

					avgUnitPrice: { $avg: '$items.unitPrice' },
					avgUnitCost: { $avg: '$items.unitCost' },
				},
			},
			{
				$addFields: {
					profit: { $subtract: ['$totalAmount', '$totalCost'] },
				},
			},
			{
				$sort: { totalQuantity: -1 },
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
		console.error(error);
		res.status(500).json({
			msg: 'Error generando reporte de ventas por producto',
		});
	}
};

const salesByRangeDayReport = async (req, res = response) => {
	try {
		const { from, to } = req.body;

		const report = await Sale.aggregate([
			{
				$match: {
					superUser: new ObjectId(req.tenant._id),
					saleDate: {
						$gt: new Date(from),
						$lt: new Date(to),
					},
				},
			},
			{
				$unwind: '$items',
			},
			{
				$group: {
					_id: {
						day: { $dayOfMonth: '$saleDate' },
						month: { $month: '$saleDate' },
						year: { $year: '$saleDate' },
					},
					count: { $sum: '$items.quantity' },
					totalSell: { $sum: '$items.total' },
					totalCost: { $sum: '$items.totalCost' },
				},
			},
			{
				$project: {
					_id: 0,
					count: 1,
					totalSell: 1,
					totalCost: 1,
					date: {
						$concat: [
							{ $toString: '$_id.month' },
							'-',
							{ $toString: '$_id.day' },
							'-',
							{ $toString: '$_id.year' },
						],
					},
					totalProfits: {
						$subtract: ['$totalSell', '$totalCost'],
					},
				},
			},
			{
				$sort: { date: 1 },
			},
		]);
		const zones = await Sale.aggregate([
			{
				$match: {
					superUser: new ObjectId(req.tenant._id),
					saleDate: {
						$gt: new Date(from),
						$lt: new Date(to),
					},
				},
			},
			{
				$unwind: '$items',
			},
			{
				$group: {
					_id: '$deliveryZone',
					totalSell: { $sum: '$items.total' },
					totalCost: { $sum: '$items.totalCost' },
				},
			},
			{
				$project: {
					_id: 0,
					zone: '$_id',
					totalSell: 1,
					totalCost: 1,
					totalProfits: {
						$subtract: ['$totalSell', '$totalCost'],
					},
				},
			},
			{
				$lookup: {
					from: 'deliveryzones',
					localField: 'zone',
					foreignField: '_id',
					as: 'zones',
				},
			},
			{
				$unwind: '$zones',
			},
			{
				$project: {
					zone: '$zones.name',
					totalSell: 1,
					totalCost: 1,
					totalProfits: 1,
				},
			},
			{
				$sort: { zone: 1 },
			},
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			from,
			to,
			data: {
				report,
				zones,
			},
		});
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

// totales ordenados por mes(cliente opcional)
const salesTotalsByMonth = async (req, res = response) => {
	try {
		const { client = '' } = req.query;

		const matchStage = {
			superUser: new ObjectId(req.tenant._id),
			saleDate: {
				$gt: new Date('2023-03-21T03:00:00.000Z'),
			},
		};

		if (client) {
			matchStage.customer = new ObjectId(client);
		}

		const report = await Sale.aggregate([
			{
				$match: matchStage,
			},
			{
				$unwind: '$items',
			},
			{
				$group: {
					_id: {
						month: { $month: '$saleDate' },
						year: { $year: '$saleDate' },
					},
					totalSell: { $sum: '$items.total' },
					totalCost: { $sum: '$items.totalCost' },
				},
			},
			{
				$project: {
					_id: 0,
					month: '$_id.month',
					year: '$_id.year',
					totalSell: 1,
					totalCost: 1,
					totalProfits: {
						$subtract: ['$totalSell', '$totalCost'],
					},
				},
			},
			{
				$sort: {
					year: 1,
					month: 1,
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
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

module.exports = {
	salesPaymentByLastXdayReport,
	salesTotalProductsReport,
	salesByRangeDayReport,
	salesTotalsByMonth,
};
