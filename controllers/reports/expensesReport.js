/* eslint-disable no-unreachable */
const { response } = require('express');
const { Expenses } = require('../../models');
const { getTokenData } = require('../../helpers');
const { logger } = require('../../helpers/logger');
const { ObjectId } = require('mongoose').Types;

// todos
const getTotalExpensesReport = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Expenses.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(tokenData.UserInfo.superUser),
				},
			},

			{
				$group: {
					_id: {
						category: '$category',
					},
					total: {
						$sum: '$amount',
					},
				},
			},

			{
				$project: {
					_id: 0,
					category: '$_id.category',

					total: 1,
				},
			},
		]);

		return res.status(200).json({
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
// por mes
const getByMonthExpensesReport = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Expenses.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(tokenData.UserInfo.superUser),
				},
			},

			{
				$group: {
					_id: {
						month: {
							$month: '$date',
						},
						year: {
							$year: '$date',
						},
					},
					total: {
						$sum: '$amount',
					},
				},
			},

			{
				$project: {
					_id: 0,

					total: 1,

					month: '$_id.month',
					year: '$_id.year',
				},
			},
		]);

		return res.status(200).json({
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
// por mes y categoria
const getByMonthAndCategoryExpensesReport = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Expenses.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(tokenData.UserInfo.superUser),
				},
			},

			{
				$group: {
					_id: {
						category: '$category',

						month: {
							$month: '$date',
						},
						year: {
							$year: '$date',
						},
					},
					total: {
						$sum: '$amount',
					},
				},
			},

			{
				$project: {
					_id: 0,
					category: '$_id.category',

					total: 1,

					month: '$_id.month',
					year: '$_id.year',
				},
			},
		]);

		return res.status(200).json({
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
// total por categoria
const getTotalCategoryExpensesReport = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Expenses.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(tokenData.UserInfo.superUser),
				},
			},

			{
				$group: {
					_id: {
						category: '$category',
					},
					total: {
						$sum: '$amount',
					},
				},
			},

			{
				$project: {
					_id: 0,
					category: '$_id.category',

					total: 1,
				},
			},
			{
				$sort: {
					total: -1,
				},
			},
		]);

		return res.status(200).json({
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
	getTotalExpensesReport,
	getByMonthExpensesReport,
	getByMonthAndCategoryExpensesReport,
	getTotalCategoryExpensesReport,
};
