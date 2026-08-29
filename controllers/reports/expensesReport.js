const { response } = require('express');
const { getExpensesModel } = require('../../helpers/expensesModelFactory');
const { getSuperUserFromRequest } = require('../../helpers/getSuperUserFromRequest');
const { logger } = require('../../helpers/logger');

// KPI summary metrics for Expenses
const getExpensesKpisReport = async (req, res = response) => {
	try {
		const { superUserObjectId } = await getSuperUserFromRequest(req);
		if (!superUserObjectId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'SuperUser no autenticado',
			});
		}

		const { year, startDate, endDate } = req.query;
		const match = {
			state: true,
			superUser: superUserObjectId,
		};

		if (startDate || endDate) {
			match.date = {};
			if (startDate) match.date.$gte = new Date(startDate);
			if (endDate) {
				const end = new Date(endDate);
				end.setUTCHours(23, 59, 59, 999);
				match.date.$lte = end;
			}
		} else if (year) {
			match.year = Number(year);
		}

		const ExpensesModel = getExpensesModel();

		const [breakdown, categoryBreakdown, topConcepts, monthlyAgg] = await Promise.all([
			// Aggregation by Type and Payment Method
			ExpensesModel.aggregate([
				{ $match: match },
				{
					$group: {
						_id: null,
						totalAmount: { $sum: '$amount' },
						count: { $sum: 1 },
						totalFixed: {
							$sum: { $cond: [{ $eq: ['$type', 'FIJO'] }, '$amount', 0] },
						},
						totalVariable: {
							$sum: { $cond: [{ $eq: ['$type', 'VARIABLE'] }, '$amount', 0] },
						},
						totalCash: {
							$sum: { $cond: [{ $eq: ['$paymentMethod', 'EFECTIVO'] }, '$amount', 0] },
						},
						totalTransfer: {
							$sum: { $cond: [{ $eq: ['$paymentMethod', 'TRANSFERENCIA'] }, '$amount', 0] },
						},
						minDate: { $min: '$date' },
						maxDate: { $max: '$date' },
					},
				},
			]),

			// Aggregation by Category
			ExpensesModel.aggregate([
				{ $match: match },
				{
					$group: {
						_id: '$category',
						total: { $sum: '$amount' },
						count: { $sum: 1 },
					},
				},
				{ $sort: { total: -1 } },
			]),

			// Top Concepts
			ExpensesModel.aggregate([
				{ $match: match },
				{
					$group: {
						_id: '$expensesName',
						total: { $sum: '$amount' },
						count: { $sum: 1 },
						category: { $first: '$category' },
						type: { $first: '$type' },
					},
				},
				{ $sort: { total: -1 } },
				{ $limit: 8 },
			]),

			// Monthly breakdown for trend
			ExpensesModel.aggregate([
				{ $match: match },
				{
					$group: {
						_id: {
							year: { $year: '$date' },
							month: { $month: '$date' },
						},
						total: { $sum: '$amount' },
						totalFixed: {
							$sum: { $cond: [{ $eq: ['$type', 'FIJO'] }, '$amount', 0] },
						},
						totalVariable: {
							$sum: { $cond: [{ $eq: ['$type', 'VARIABLE'] }, '$amount', 0] },
						},
					},
				},
				{ $sort: { '_id.year': 1, '_id.month': 1 } },
			]),
		]);

		const summary = breakdown[0] || {
			totalAmount: 0,
			count: 0,
			totalFixed: 0,
			totalVariable: 0,
			totalCash: 0,
			totalTransfer: 0,
			minDate: null,
			maxDate: null,
		};

		// Calculate daily average
		let daysDiff = 1;
		if (summary.minDate && summary.maxDate) {
			const diffMs = new Date(summary.maxDate) - new Date(summary.minDate);
			daysDiff = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
		}
		const dailyAverage = summary.totalAmount > 0 ? summary.totalAmount / daysDiff : 0;

		return res.status(200).json({
			ok: true,
			status: 200,
			data: {
				summary: {
					...summary,
					dailyAverage,
					daysCount: daysDiff,
					fixedPercentage: summary.totalAmount ? (summary.totalFixed / summary.totalAmount) * 100 : 0,
					variablePercentage: summary.totalAmount ? (summary.totalVariable / summary.totalAmount) * 100 : 0,
					cashPercentage: summary.totalAmount ? (summary.totalCash / summary.totalAmount) * 100 : 0,
					transferPercentage: summary.totalAmount ? (summary.totalTransfer / summary.totalAmount) * 100 : 0,
				},
				categories: categoryBreakdown.map((c) => ({
					category: c._id || 'Otros',
					total: c.total,
					count: c.count,
					percentage: summary.totalAmount ? (c.total / summary.totalAmount) * 100 : 0,
				})),
				topConcepts: topConcepts.map((tc) => ({
					concept: tc._id,
					total: tc.total,
					count: tc.count,
					category: tc.category,
					type: tc.type,
				})),
				monthlyTrend: monthlyAgg.map((m) => ({
					year: m._id.year,
					month: m._id.month,
					total: m.total,
					totalFixed: m.totalFixed,
					totalVariable: m.totalVariable,
				})),
				modelVersion: process.env.EXPENSES_MODEL_VERSION || 'v2',
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

// todos
const getTotalExpensesReport = async (req, res = response) => {
	try {
		const { superUserObjectId } = await getSuperUserFromRequest(req);
		if (!superUserObjectId) {
			return res.status(401).json({ ok: false, status: 401, msg: 'SuperUser no autenticado' });
		}

		const ExpensesModel = getExpensesModel();
		const report = await ExpensesModel.aggregate([
			{
				$match: {
					state: true,
					superUser: superUserObjectId,
				},
			},
			{
				$group: {
					_id: { category: '$category' },
					total: { $sum: '$amount' },
				},
			},
			{
				$project: {
					_id: 0,
					category: '$_id.category',
					total: 1,
				},
			},
			{ $sort: { total: -1 } },
		]);

		return res.status(200).json({
			ok: true,
			status: 200,
			data: { report },
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
		const { superUserObjectId } = await getSuperUserFromRequest(req);
		if (!superUserObjectId) {
			return res.status(401).json({ ok: false, status: 401, msg: 'SuperUser no autenticado' });
		}

		const { year } = req.query;
		const match = {
			state: true,
			superUser: superUserObjectId,
		};
		if (year) match.year = Number(year);

		const ExpensesModel = getExpensesModel();
		const report = await ExpensesModel.aggregate([
			{ $match: match },
			{
				$group: {
					_id: {
						month: { $month: '$date' },
						year: { $year: '$date' },
					},
					total: { $sum: '$amount' },
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
			{ $sort: { year: 1, month: 1 } },
		]);

		return res.status(200).json({
			ok: true,
			status: 200,
			data: { report },
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
		const { superUserObjectId } = await getSuperUserFromRequest(req);
		if (!superUserObjectId) {
			return res.status(401).json({ ok: false, status: 401, msg: 'SuperUser no autenticado' });
		}

		const ExpensesModel = getExpensesModel();
		const report = await ExpensesModel.aggregate([
			{
				$match: {
					state: true,
					superUser: superUserObjectId,
				},
			},
			{
				$group: {
					_id: {
						category: '$category',
						month: { $month: '$date' },
						year: { $year: '$date' },
					},
					total: { $sum: '$amount' },
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
			{ $sort: { year: 1, month: 1 } },
		]);

		return res.status(200).json({
			ok: true,
			status: 200,
			data: { report },
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
		const { superUserObjectId } = await getSuperUserFromRequest(req);
		if (!superUserObjectId) {
			return res.status(401).json({ ok: false, status: 401, msg: 'SuperUser no autenticado' });
		}

		const { year } = req.query;
		const match = {
			state: true,
			superUser: superUserObjectId,
		};
		if (year) match.year = Number(year);

		const ExpensesModel = getExpensesModel();
		const report = await ExpensesModel.aggregate([
			{ $match: match },
			{
				$group: {
					_id: { category: '$category' },
					total: { $sum: '$amount' },
				},
			},
			{
				$project: {
					_id: 0,
					category: '$_id.category',
					total: 1,
				},
			},
			{ $sort: { total: -1 } },
		]);

		return res.status(200).json({
			ok: true,
			status: 200,
			data: { report },
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
	getExpensesKpisReport,
	getTotalExpensesReport,
	getByMonthExpensesReport,
	getByMonthAndCategoryExpensesReport,
	getTotalCategoryExpensesReport,
};
