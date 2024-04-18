const { response } = require('express');
const { Order, Stock } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getOrders = async (req, res = response) => {
	try {
		const { limit = 10000000, from = 0, active, delivery = '' } = req.query;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);
		const query = { state: true, superUser: tokenData.UserInfo.superUser };

		const [total, orders] = await Promise.all([
			Order.countDocuments(query),
			Order.find(query)
				.skip(Number(from))
				.limit(Number(limit))
				.populate('deliveryTruck')
				.populate('employee')
				.populate('deliveryZone')
				.sort({ createdAt: -1 }),
		]);

		if (delivery && delivery !== '' && active === 'true') {
			const ordersActives = await Order.find({
				active: true,
				deliveryTruck: delivery,
				state: true,
				superUser: tokenData.UserInfo.superUser,
			})
				.populate('deliveryTruck')
				.populate('employee')
				.populate('deliveryZone');

			return res.status(200).json({
				ok: true,
				status: 200,
				total: ordersActives.length,
				data: {
					orders: ordersActives,
				},
			});
		}

		res.status(200).json({
			ok: true,
			status: 200,
			total,
			data: {
				orders,
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

const getOrdersPaginate = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);
		const { limit = 10000, page = 1, active = 'false', paid } = req.query;
		// active = "false"  => all

		if (active === 'true') {
			const query = {
				state: true,
				active: true,
				superUser: tokenData.UserInfo.superUser,
			};

			const [total, orders] = await Promise.all([
				Order.countDocuments(query),
				Order.find(query)
					.skip(Number((page - 1) * limit))
					.limit(Number(limit * 1))
					.populate('deliveryTruck')
					.populate('employee')
					.populate('deliveryZone')
					.sort({ createdAt: -1 }),
			]);

			return res.status(200).json({
				ok: true,
				status: 200,
				total,
				data: {
					orders,
				},
			});
		}
		if (paid === 'false') {
			const query = {
				state: true,
				paid: false,
				superUser: tokenData.UserInfo.superUser,
			};

			const [total, orders] = await Promise.all([
				Order.countDocuments(query),
				Order.find(query)
					.skip(Number((page - 1) * limit))
					.limit(Number(limit * 1))
					.populate('deliveryTruck')
					.populate('employee')
					.populate('deliveryZone')
					.sort({ createdAt: -1 }),
			]);

			return res.status(200).json({
				ok: true,
				status: 200,
				total,
				data: {
					orders,
				},
			});
		}

		const query = { state: true, superUser: tokenData.UserInfo.superUser };

		const [total, orders] = await Promise.all([
			Order.countDocuments(query),
			Order.find(query)
				.skip(Number((page - 1) * limit))
				.limit(Number(limit * 1))
				.populate('deliveryTruck')
				.populate('employee')
				.populate('deliveryZone')
				.sort({ createdAt: -1 }),
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			total,
			data: {
				orders,
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

const getOrder = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { stock } = req.query;

		if (+stock === 1) {
			const order = await Order.findById(id)
				.populate('deliveryTruck')
				.populate('employee')
				.populate('deliveryZone');

			const availableStock = [];
			const modifyStock = [];

			for (let i = 0; i < order.orderItems.length; i++) {
				const stock = await Stock.find({
					state: true,
					product: order.orderItems[i].productId,
					stock: {
						$gt: 0,
					},
				});
				availableStock.push({
					product: order.orderItems[i].productId,
					stock,
					modifyStock,
				});
			}

			return res.status(200).json({
				ok: true,
				status: 200,
				data: {
					order,
					stock: availableStock,
				},
			});
		}
		const order = await Order.findById(id)
			.populate('deliveryTruck')
			.populate('employee')
			.populate('deliveryZone');

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				order,
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
// ✔
const postOrder = async (req, res = response) => {
	try {
		const { state, paid, subTotal, client, orderItems, ...body } = req.body;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const data = {
			...body,
			orderItems,
			paid,
			subTotal,
			client,
			superUser: tokenData.UserInfo.superUser,
		};

		const order = new Order(data);
		// 1. Restar stock

		for (let i = 0; i < orderItems.length; i++) {
			for (let x = 0; x < orderItems[i].stockData.length; x++) {
				const stockId = orderItems[i].stockData[x].stockId;
				const newStock = orderItems[i].stockData[x].quantityNew;

				const res = await Stock.findByIdAndUpdate(stockId, { stock: newStock });
				console.log(res);
			}
		}

		// 2. Puntos
		// Si esta paga se cargan los puntos
		/* 	if (paid) {
			const dataPoints = {
				clientId: client,
				points: Math.trunc(subTotal),
				action: 'buy',
				orderId: order._id,
				superUser: tokenData.UserInfo.superUser,
			};

			const points = new Points(dataPoints);
			// Guardar DB
			await points.save();

			// actualizo puntos dentro de cliente
			const pointsData = await Points.find({ state: true, clientId: client });
			const totalPoints = pointsData.reduce(
				(acc, curr) => acc + curr.points,
				0
			);

			await Client.findByIdAndUpdate(client, { points: totalPoints });
		} */

		// Guardar DB
		await order.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				order,
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

const putOrder = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		if (data?.orderItems) {
			for (let i = 0; i < data.orderItems.length; i++) {
				for (let x = 0; x < data.orderItems[i]?.stockData.length; x++) {
					const stockId = data.orderItems[i].stockData[x].stockId;
					const newStock = data.orderItems[i].stockData[x].quantityNew;

					const res = await Stock.findByIdAndUpdate(stockId, {
						stock: newStock,
					});
					console.log(res);
				}
			}

			// Si se borro el producto totalQuantity es 0, filtramos y borramos eso productos de orderItems
			const filterEmptyProducts = data.orderItems.filter(
				(product) => product.totalQuantity
			);
			const dataFilter = {
				...data,
				orderItems: filterEmptyProducts,
			};

			const order = await Order.findByIdAndUpdate(id, dataFilter);

			// Si estaba impaga y paso a estar paga
			/* if (order.paid === false && req.body.paid === true) {
				const dataPoints = {
					clientId: order.client,
					points: Math.trunc(order.subTotal),
					action: 'buy',
					orderId: order._id,
					superUser: tokenData.UserInfo.superUser,
				};
	
				const points = new Points(dataPoints);
				// Guardar DB
				await points.save();
	
				// actualizo puntos dentro de cliente
				const pointsData = await Points.find({
					state: true,
					clientId: order.client,
				});
				const totalPoints = pointsData.reduce(
					(acc, curr) => acc + curr.points,
					0
				);
				console.log(totalPoints);
				const id = order.client;
				await Client.findByIdAndUpdate(id, { points: totalPoints });
			} */

			return res.status(200).json({
				ok: true,
				status: 200,
				data: {
					order,
				},
			});
		}

		const order = await Order.findByIdAndUpdate(id, data, { new: true });

		return res.status(200).json({
			ok: true,
			status: 200,
			data: {
				order,
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

// ✔
const deleteOrder = async (req, res = response) => {
	try {
		// 1. Borramos la orden
		const { id } = req.params;
		const order = await Order.findByIdAndUpdate(
			id,
			{ state: false },
			{ new: true }
		);

		const orderItems = order?.orderItems;

		// 2. Devolvemos el stock de todos los productos
		for (let i = 0; i < orderItems.length; i++) {
			if (orderItems[i].stockData) {
				for (let x = 0; x < orderItems[i].stockData.length; x++) {
					const stockId = orderItems[i].stockData[x].stockId;

					const stock = await Stock.findById(stockId);

					const newStock =
						stock.stock + orderItems[i].stockData[x].quantityModify;

					await Stock.findByIdAndUpdate(
						stockId,
						{ stock: newStock },
						{ new: true }
					);
				}
			}
		}

		/* // Si esta paga se cargan los puntos
		if (order.paid) {
			await Points.findOneAndUpdate(
				{ orderId: order._id },
				{ state: false },
				{ new: true }
			);

			// actualizo puntos dentro de cliente
			const pointsData = await Points.find({
				state: true,
				clientId: order.client,
			});
			const totalPoints = pointsData.reduce(
				(acc, curr) => acc + curr.points,
				0
			);
			console.log(totalPoints);
			const id = order.client;
			await Client.findByIdAndUpdate(id, { points: totalPoints });
		} */

		res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Orden eliminada',
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

const getUserOrder = async (req, res = response) => {
	try {
		const { id } = req.params;
		const order = await Order.find({ userId: id, state: true })
			.populate('deliveryTruck')
			.populate('employee')
			.populate('deliveryZone');

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				order,
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
const getClientOrder = async (req, res = response) => {
	try {
		const { id } = req.params;
		const orders = await Order.find({ client: id, state: true })
			.populate('deliveryTruck')
			.populate('employee')
			.populate('deliveryZone')
			.sort({ createdAt: -1 });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				orders,
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

const getOrdersToday = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);
		const today = new Date();

		const from = new Date(
			today.getUTCFullYear(),
			today.getUTCMonth(),
			today.getUTCDate()
		);
		const to = new Date(
			today.getUTCFullYear(),
			today.getUTCMonth(),
			today.getUTCDate(),
			23,
			59,
			59,
			999
		);

		const query = {
			state: true,
			superUser: tokenData.UserInfo.superUser,
			$and: [{ deliveryDate: { $gte: from } }, { deliveryDate: { $lte: to } }],
		};

		const [total, orders] = await Promise.all([
			Order.countDocuments(query),
			Order.find(query)

				.populate('deliveryTruck')
				.populate('employee')
				.populate('deliveryZone'),
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			total,
			from,
			to,
			data: {
				orders,
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
const getOrdersByDay = async (req, res = response) => {
	try {
		const { days } = req.params;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);
		const orders = await Order.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
			deliveryDate: {
				$lt: new Date(),
				$gte: new Date(new Date().setDate(new Date().getDate() - +days)),
			},
		})
			.sort({ deliveryDate: 1 })
			.populate('deliveryTruck')
			.populate('employee')
			.populate('deliveryZone');

		res.status(200).json({
			ok: true,
			status: 200,
			total: orders.length,
			from: new Date(),
			to: new Date(new Date().setDate(new Date().getDate() - +days)),
			range: +days,
			data: {
				orders,
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

const getOrdersActives = async (req, res = response) => {
	try {
		const { limit = 1000, from = 0 } = req.query;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);
		const query = {
			state: true,
			active: true,
			superUser: tokenData.UserInfo.superUser,
		};

		const [total, orders] = await Promise.all([
			Order.countDocuments(query),
			Order.find(query)
				.skip(Number(from))
				.limit(Number(limit))
				.populate('deliveryTruck')
				.populate('employee')
				.populate('deliveryZone'),
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			total,
			data: {
				orders,
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

const getClientOrderDebt = async (req, res = response) => {
	try {
		const { id } = req.params;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const orders = await Order.find({
			state: true,
			client: id,
			paid: false,
			status: 'Entregado',
			superUser: tokenData.UserInfo.superUser,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			total: orders.length,
			data: {
				orders,
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
// ✔
const getOrdersCashier = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const orders = await Order.find({
			state: true,
			cashierMode: true,
			superUser: tokenData.UserInfo.superUser,
		})
			.populate('userId')
			.populate('client');

		const ordersWithStockAvailable = [];

		for (let i = 0; i < orders.length; i++) {
			const order = orders[i];

			const orderItemsWithStock = [];

			for (let x = 0; x < order.orderItems.length; x++) {
				const product = order.orderItems[x];

				const stock = await Stock.find({
					state: true,
					product: product.productId,
					stock: {
						$gt: 0,
					},
				});

				orderItemsWithStock.push({
					...product._doc,
					stockAvailable: stock,
				});
			}

			ordersWithStockAvailable.push({
				...order._doc,
				orderItems: orderItemsWithStock,
			});
		}

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				orders: ordersWithStockAvailable,
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

const putOrderSetInactiveAll = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		await Order.updateMany(
			{ state: true, active: true, superUser: tokenData.UserInfo.superUser },
			{ $set: { active: false } }
		);

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
	postOrder,
	getOrders,
	getOrder,
	putOrder,
	deleteOrder,
	getUserOrder,
	getClientOrder,
	getOrdersToday,
	getOrdersActives,
	getOrdersByDay,
	getOrdersPaginate,
	getClientOrderDebt,
	getOrdersCashier,
	putOrderSetInactiveAll,
};
