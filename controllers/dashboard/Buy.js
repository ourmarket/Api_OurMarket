/* eslint-disable no-dupe-keys */
/* eslint-disable camelcase */
const { response } = require('express');
const { ObjectId } = require('mongodb');
const { logger } = require('../../helpers/logger');
const { Buy } = require('../../models');

const reportTotalBuy = async (req, res = response) => {
	try {
		const report = await Buy.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(req.tenant._id),
				},
			},
			{
				$group: {
					_id: '$paid',
					totals: {
						$sum: '$total',
					},
				},
			},
			{
				$project: {
					_id: 0,
					paid: '$_id',
					totals: 1,
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
	reportTotalBuy,
};
