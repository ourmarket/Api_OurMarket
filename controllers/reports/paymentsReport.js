/* eslint-disable no-unreachable */
const { response } = require('express');
const { Order } = require('../../models');
const { getTokenData } = require('../../helpers');
const { logger } = require('../../helpers/logger');
const { convertToDate } = require('../../helpers/convertToDate');
const { ObjectId } = require('mongoose').Types;

// total pagos por rango de días
const paymentByLastXdayReport = async (req, res = response) => {
	try {
		const { days } = req.query;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Order.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(tokenData.UserInfo.superUser),
					deliveryDate: {
						$gte: new Date(new Date().setDate(new Date().getDate() - +days)),
					},
				},
			},
			{
				$group: {
					_id: {
						day: {
							$dayOfMonth: '$deliveryDate',
						},
						month: {
							$month: '$deliveryDate',
						},
						year: {
							$year: '$deliveryDate',
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

module.exports = {
	paymentByLastXdayReport,
};
