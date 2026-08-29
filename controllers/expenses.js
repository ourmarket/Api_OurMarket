const { response } = require('express');
const { getExpensesModel } = require('../helpers/expensesModelFactory');
const { getSuperUserFromRequest } = require('../helpers/getSuperUserFromRequest');
const { logger } = require('../helpers/logger');

const getAllExpenses = async (req, res = response) => {
	try {
		const { superUserId } = await getSuperUserFromRequest(req);

		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No se encontró el superUser en la sesión',
			});
		}

		const {
			startDate,
			endDate,
			category,
			type,
			paymentMethod,
			limit = 5000,
			skip = 0,
		} = req.query;

		const filter = {
			state: true,
			superUser: superUserId,
		};

		if (startDate || endDate) {
			filter.date = {};
			if (startDate) filter.date.$gte = new Date(startDate);
			if (endDate) {
				const end = new Date(endDate);
				end.setUTCHours(23, 59, 59, 999);
				filter.date.$lte = end;
			}
		}

		if (category && category !== 'TODOS') filter.category = category;
		if (type && type !== 'TODOS') filter.type = type;
		if (paymentMethod && paymentMethod !== 'TODOS') filter.paymentMethod = paymentMethod;

		const ExpensesModel = getExpensesModel();
		const [total, expenses] = await Promise.all([
			ExpensesModel.countDocuments(filter),
			ExpensesModel.find(filter)
				.sort({ date: -1, createdAt: -1 })
				.skip(Number(skip))
				.limit(Number(limit)),
		]);

		return res.status(200).json({
			ok: true,
			status: 200,
			total,
			data: {
				expenses,
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

const getExpenses = async (req, res = response) => {
	try {
		const { id } = req.params;
		const ExpensesModel = getExpensesModel();
		const expenses = await ExpensesModel.findById(id);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				expenses,
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

const postExpenses = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;
		const { superUserId } = await getSuperUserFromRequest(req);

		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No se encontró el superUser en la sesión',
			});
		}

		const data = {
			...body,
			superUser: superUserId,
		};

		const ExpensesModel = getExpensesModel();
		const expenses = new ExpensesModel(data);
		await expenses.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				expenses,
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

const postDailyBatchExpenses = async (req, res = response) => {
	try {
		const { date, items } = req.body;
		if (!date || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: 'Debe proporcionar una fecha y un arreglo de gastos (items)',
			});
		}

		const { superUserId } = await getSuperUserFromRequest(req);
		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No se encontró el superUser en la sesión',
			});
		}

		const targetDate = new Date(date);
		const ExpensesModel = getExpensesModel();
		const operations = items.map((item) => {
			const data = {
				expensesName: item.expensesName || item.concept,
				category: item.category || 'Otros',
				type: item.type || 'VARIABLE',
				paymentMethod: item.paymentMethod || 'EFECTIVO',
				amount: Number(item.amount || 0),
				date: targetDate,
				isProrated: Boolean(item.isProrated),
				source: 'DASHBOARD',
				state: true,
				superUser: superUserId,
			};

			if (item._id) {
				return {
					updateOne: {
						filter: { _id: item._id, superUser: superUserId },
						update: { $set: data },
						upsert: false,
					},
				};
			}

			return {
				insertOne: {
					document: data,
				},
			};
		});

		const result = await ExpensesModel.bulkWrite(operations);

		res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Gastos diarios procesados correctamente',
			data: {
				result,
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

const postMonthlyProrateExpenses = async (req, res = response) => {
	try {
		const { year, month, items } = req.body;
		if (!year || !month || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: 'Debe especificar el año, el mes (1-12) y los conceptos a prorratear (items)',
			});
		}

		const { superUserId } = await getSuperUserFromRequest(req);
		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No se encontró el superUser en la sesión',
			});
		}

		// Calculate total days in this month
		const daysInMonth = new Date(year, month, 0).getDate();
		const ExpensesModel = getExpensesModel();
		const operations = [];

		for (let day = 1; day <= daysInMonth; day++) {
			const targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

			for (const item of items) {
				const expensesName = (item.expensesName || item.concept || '').trim().toUpperCase();
				if (!expensesName) continue;

				let dailyAmount = Number(item.dailyAmount || 0);
				if (!dailyAmount && item.monthlyAmount) {
					dailyAmount = Math.round((Number(item.monthlyAmount) / daysInMonth) * 100) / 100;
				}
				if (dailyAmount <= 0) continue;

				const syncKey = `${superUserId}_${targetDate.toISOString().split('T')[0]}_${expensesName}_PRORRATED`;

				operations.push({
					updateOne: {
						filter: { superUser: superUserId, syncKey },
						update: {
							$set: {
								expensesName,
								category: item.category || 'Alquiler/Seguro',
								type: 'FIJO',
								paymentMethod: item.paymentMethod || 'EFECTIVO',
								amount: dailyAmount,
								date: targetDate,
								year: Number(year),
								month: targetDate.toLocaleString('es-ES', { month: 'long' }),
								isProrated: true,
								source: 'DASHBOARD',
								syncKey,
								state: true,
								superUser: superUserId,
							},
						},
						upsert: true,
					},
				});
			}
		}

		if (operations.length === 0) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: 'No se encontraron conceptos válidos con montos mayores a 0 para prorratear',
			});
		}

		const result = await ExpensesModel.bulkWrite(operations, { ordered: false });

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: `Prorrateo mensual generado con éxito para ${daysInMonth} días`,
			data: {
				daysInMonth,
				totalOperations: operations.length,
				upsertedCount: result.upsertedCount || 0,
				modifiedCount: result.modifiedCount || 0,
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

const putExpenses = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;
		const ExpensesModel = getExpensesModel();

		const expenses = await ExpensesModel.findByIdAndUpdate(id, data, {
			new: true,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				expenses,
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

const deleteExpenses = async (req, res = response) => {
	try {
		const { id } = req.params;
		const ExpensesModel = getExpensesModel();

		await ExpensesModel.findByIdAndUpdate(id, { state: false }, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
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
	postExpenses,
	postDailyBatchExpenses,
	postMonthlyProrateExpenses,
	getAllExpenses,
	getExpenses,
	putExpenses,
	deleteExpenses,
};
