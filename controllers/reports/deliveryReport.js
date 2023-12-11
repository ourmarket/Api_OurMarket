const { response } = require('express');
const { Order } = require('../../models');
const { getTokenData } = require('../../helpers');
const { ObjectId } = require('mongoose').Types;

// ordenes
const deliveryOrders = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { from, to } = req.body; // "Tue, 21 Mar 2023 00:00:00 GMT"
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Order.aggregate([
			{
				$match: {
					state: true,
					deliveryTruck: new ObjectId(id),
					superUser: new ObjectId(tokenData.UserInfo.superUser),
					deliveryDate: {
						$gt: new Date(from),
						$lt: new Date(to),
					},
				},
			},
		]);

		return res.status(200).json({
			ok: true,
			status: 200,
			from,
			to,
			data: {
				report,
			},
		});
	} catch (error) {
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};
const individualDeliveryReport = async (req, res = response) => {};

module.exports = {
	deliveryOrders,
	individualDeliveryReport,
};
