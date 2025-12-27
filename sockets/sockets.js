const { getTokenData } = require('../helpers');

module.exports = (io) => {
	const deliveryPosition = io.of('/orders/delivery');
	const ordersCashier = io.of('/orders/cashier');

	deliveryPosition.on('connection', (socket) => {
		const tokenData = getTokenData(socket.handshake.query['x-token']);

		if (!tokenData?.UserInfo.superUser) {
			console.log('Socket no identificado');
			return socket.disconnect();
		}

		console.log(
			`Una conexión de superUser: ${req.tenant._idData.name} ${req.tenant._idData.lastName} a socket.io => /orders/delivery`
		);

		socket.on('position', (data) => {
			const superUser = req.tenant._id;

			if (data?.truckId && data.superUser === superUser) {
				deliveryPosition.emit('delivery', data);

				if (process.env.NODE_ENV !== 'production') {
					console.log('CLIENTE EMITIÓ: ', data);
				}
			}
		});

		socket.on('disconnect', (data) => {
			console.log('Se desconectó de socket.io');
		});
	});

	ordersCashier.on('connection', (socket) => {
		const tokenData = getTokenData(socket.handshake.query['x-token']);

		if (!tokenData?.UserInfo.superUser) {
			console.log('Socket no identificado');
			return socket.disconnect();
		}

		console.log(
			`Una conexión de superUser: ${req.tenant._idData.name} ${req.tenant._idData.lastName} a socket.io => /orders/cashier`
		);

		socket.on('order', async (data) => {
			const superUser = req.tenant._id;

			if (data.superUser === superUser) {
				console.log('CLIENTE EMITIÓ: ', data);
				ordersCashier.emit('orderData', data);
			}
		});

		socket.on('disconnect', (data) => {
			console.log('Se desconectó de socket.io');
		});
	});
};
