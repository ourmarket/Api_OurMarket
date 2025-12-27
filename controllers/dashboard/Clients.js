const { response } = require('express');
const ClientSalesSummary = require('../../models/clientSalesSummary');
const { logger } = require('../../helpers/logger');

const ClientsTopSummaryReport = async (req, res = response) => {
	try {
		const superUser = req.tenant._id;
		const limit = Number(req.query.limit || 12);

		const populateClientUser = {
			path: 'client',
			select: 'active user',
			populate: {
				path: 'user',
				select: 'name lastName email',
			},
		};

		const [topDebt, topActiveProfits, topInactiveProfits] = await Promise.all([
			// 1️⃣ Clientes con más deuda
			ClientSalesSummary.find(
				{ superUser, 'payment.debt': { $gt: 0 } },
				{
					client: 1,
					totalBuy: 1,
					totalProfits: 1,
					'payment.debt': 1,
				}
			)
				.sort({ 'payment.debt': -1 })
				.limit(limit)
				.populate(populateClientUser)
				.lean(),

			// 2️⃣ Activos con más ganancia
			ClientSalesSummary.find(
				{ superUser, active: true },
				{
					client: 1,
					totalBuy: 1,
					totalProfits: 1,
					ordersCount: 1,
				}
			)
				.sort({ totalProfits: -1 })
				.limit(limit)
				.populate(populateClientUser)
				.lean(),

			// 3️⃣ Inactivos con más ganancia
			ClientSalesSummary.find(
				{ superUser, active: false },
				{
					client: 1,
					totalBuy: 1,
					totalProfits: 1,
					ordersCount: 1,
				}
			)
				.sort({ totalProfits: -1 })
				.limit(limit)
				.populate(populateClientUser)
				.lean(),
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				topDebt,
				topActiveProfits,
				topInactiveProfits,
			},
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

module.exports = {
	ClientsTopSummaryReport,
};
