const { response } = require('express');
const { Sale, Config, Client, Points, Recommendation, Order } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getSales = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);
		const { limit = 1000, from = 0 } = req.query;
		const query = { state: true, superUser: tokenData.UserInfo.superUser };

		const [total, sales] = await Promise.all([
			Sale.countDocuments(query),
			Sale.find(query).skip(Number(from)).limit(Number(limit)),
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			total,
			data: {
				sales,
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

const getSale = async (req, res = response) => {
	try {
		const { id } = req.params;
		const sale = await Sale.findById(id);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				sale,
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

const postSale = async (req, res = response) => {
	try {
		const { state, pointsUsed = 0, ...body } = req.body;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		let pointsDiscount = 0;
		const config = await Config.findOne({ superUser: tokenData.UserInfo.superUser, state: true });

		if (pointsUsed > 0 && body.clientId) {
			const clientData = await Client.findById(body.clientId);
			if (clientData && clientData.points >= pointsUsed) {
				const conversionRate = config?.pointsConversionRate || 10;
				pointsDiscount = pointsUsed / conversionRate;
			} else {
				throw new Error('Puntos insuficientes');
			}
		}

		// Ajustar totales de venta
		const finalTotalSale = body.totalSale ? body.totalSale - pointsDiscount : undefined;

		// Generar la data a guardar
		const data = {
			...body,
			totalSale: finalTotalSale,
			pointsUsed,
			pointsDiscount,
			superUser: tokenData.UserInfo.superUser,
		};

		const sale = new Sale(data);

		// Guardar DB
		await sale.save();

		// Lógica Post-Venta
		if (pointsUsed > 0 && body.clientId) {
			const newPointsRecord = new Points({
				clientId: body.clientId,
				points: -pointsUsed,
				action: 'exchange',
				superUser: tokenData.UserInfo.superUser,
			});
			await newPointsRecord.save();
			await Client.findByIdAndUpdate(body.clientId, { $inc: { points: -pointsUsed } });
		}

		// Primera compra (Sale)
		if (body.clientId) {
			const previousSalesCount = await Sale.countDocuments({ clientId: body.clientId, _id: { $ne: sale._id } });
			const previousOrdersCount = await Order.countDocuments({ client: body.clientId, paid: true });
			if (previousSalesCount === 0 && previousOrdersCount === 0) {
				const recommendation = await Recommendation.findOne({ recommendedClient: body.clientId, state: true });
				if (recommendation) {
					const pointsToGive = config?.pointsPerReferral || 500;
					const daysToExpire = config?.pointsExpirationDays || 90;
					const expiresAt = new Date();
					expiresAt.setDate(expiresAt.getDate() + daysToExpire);

					const rewardPoints = new Points({
						clientId: recommendation.clientId,
						points: pointsToGive,
						action: 'recommendation',
						recommendedClientId: body.clientId,
						expiresAt,
						superUser: tokenData.UserInfo.superUser
					});
					await rewardPoints.save();
					await Client.findByIdAndUpdate(recommendation.clientId, { $inc: { points: pointsToGive } });
				}
			}
		}

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				sale,
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

const putSale = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const sale = await Sale.findByIdAndUpdate(id, data, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				sale,
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

const deleteSale = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Sale.findByIdAndUpdate(id, { state: false }, { new: true });

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
	postSale,
	getSales,
	getSale,
	putSale,
	deleteSale,
};
