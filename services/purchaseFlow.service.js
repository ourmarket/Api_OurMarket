const { PurchaseOrder, Buy, GoodsReceipt } = require('../models');
const PurchaseAdjustmentService = require('./purchaseAdjustment.service');
const StockService = require('./stock.service');
const { generateDocumentCode } = require('./documentNumber.service');

class PurchaseFlowService {
	/* ======================================================
	 * CREATE BUY
	 * ====================================================== */
	static async createBuy(data) {
		const {
			code,
			purchaseOrder,
			items: itemsFromData,
			supplier,
			documentNumber,
			date,
			amount,
			createdBy,
			superUser,
		} = data;

		let items = itemsFromData || [];
		if (purchaseOrder) {
			const po = await PurchaseOrder.findById(purchaseOrder);
			if (!po) throw new Error('Purchase order not found');

			items = po.items.map((item) => ({
				product: item.product,
				nameSnapshot: item.nameSnapshot,
				quantity: item.quantityOrdered,
				unitCost: item.estimatedUnitCost || 0,
			}));

			// Opcionalmente cerrar la PO
			if (po.status === 'APPROVED') {
				po.status = 'CLOSED';
				po.statusHistory.push({
					status: 'CLOSED',
					changedAt: new Date(),
					changedBy: createdBy,
				});
				await po.save();
			}
		}

		const buy = new Buy({
			code,
			purchaseOrder: purchaseOrder,
			supplier,
			documentNumber,
			date,
			total: amount,
			items,
			createdBy,
			superUser,
		});

		// Registrar creación en historial
		buy.history.push({
			action: 'CREATED',
			description: `Compra registrada con código ${code}`,
			performedBy: createdBy,
		});

		await buy.save();
		return buy;
	}

	/* ======================================================
	 * REGISTER PAYMENT
	 * ====================================================== */
	static async registerPayment(data) {
		const { buyId, amount, paymentMethod, reference, paidBy } = data;

		const buy = await Buy.findById(buyId);
		if (!buy) throw new Error('Buy not found');

		// Registrar el pago en el array de historial
		buy.payments.push({
			amount,
			paymentMethod,
			reference,
			createdBy: paidBy,
		});

		// Registrar el pago en el array de historial de la compra
		buy.history.push({
			action: 'PAYMENT_ADDED',
			description: `Pago registrado por un monto de ${amount} (${paymentMethod})`,
			performedBy: paidBy,
			meta: { amount, paymentMethod, reference },
		});

		// Actualizar estado general de la compra
		const totalPaid = buy.payments.reduce((acc, p) => acc + p.amount, 0);
		const oldStatus = buy.status;

		if (totalPaid >= buy.total) {
			buy.status = 'PAID';
		} else if (totalPaid > 0) {
			buy.status = 'PARTIAL';
		} else {
			buy.status = 'PENDING';
		}

		if (oldStatus !== buy.status) {
			buy.history.push({
				action: 'STATUS_CHANGED',
				description: `Estado de la compra cambió de ${oldStatus} a ${buy.status}`,
				performedBy: paidBy,
				meta: { from: oldStatus, to: buy.status },
			});
		}

		await buy.save();
		return buy;
	}

	/* ======================================================
	 * CHANGE PURCHASE ORDER STATUS
	 * ====================================================== */
	static async changePurchaseOrderStatus(poId, nextStatus, userId) {
		const po = await PurchaseOrder.findById(poId);

		if (!po) throw new Error('Purchase order not found');

		const currentStatus = po.status;

		const validTransitions = {
			DRAFT: ['SUBMITTED', 'CANCELLED'],
			SUBMITTED: ['APPROVED', 'CANCELLED'],
			APPROVED: ['EXECUTED'],
			EXECUTED: ['CLOSED'],
		};

		if (!validTransitions[currentStatus]?.includes(nextStatus)) {
			throw new Error(
				`Invalid status transition from ${currentStatus} to ${nextStatus}`
			);
		}

		// 🔒 Validaciones al SUBMITTED
		if (nextStatus === 'SUBMITTED') {
			if (!po.supplier)
				throw new Error('Supplier is required to submit purchase order');

			if (!po.expectedDate)
				throw new Error('Expected delivery date is required');

			if (!po.items || po.items.length === 0)
				throw new Error('At least one item is required');

			const invalidItem = po.items.find(
				(i) => !i.product || !i.quantityOrdered
			);

			if (invalidItem)
				throw new Error('All items must have product and quantity');
		}

		po.status = nextStatus;
		po.statusHistory.push({
			status: nextStatus,
			changedBy: userId,
			changedAt: new Date(),
		});

		await po.save();
		return po;
	}

	/* ======================================================
	 * CLOSE PURCHASE ORDER
	 * ====================================================== */
	static async closePurchaseOrder(poId, userId) {
		const po = await PurchaseOrder.findById(poId);

		if (!po) throw new Error('Purchase order not found');
		if (po.status !== 'APPROVED')
			throw new Error('Only approved purchase orders can be closed');

		po.status = 'CLOSED';
		po.statusHistory.push({
			status: 'CLOSED',
			changedBy: userId,
			changedAt: new Date(),
		});

		await po.save();
		return po;
	}
	/* ======================================================
	 * RECEIVE GOODS
	 * ==================================== ================== */
	static async receiveGoods({
		stockCode,
		receiptCode,
		buyId,
		supplier,
		generalObservations,
		items,
		receivedBy,
		receivedAt,
		superUser,
	}) {
		try {
			const buy = await Buy.findById(buyId).populate('items.product');

			if (!buy) throw new Error('Buy not found');

			const receipt = await GoodsReceipt.create({
				code: receiptCode,
				buyId,
				supplier,
				generalObservations,
				receivedBy,
				receivedAt,
				superUser,
				items,
			});

			const adjustmentItems = [];

			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				const buyItem = buy.items.find((i) =>
					i.product._id.equals(item.product)
				);

				if (!buyItem) {
					throw new Error('Product not found in buy');
				}

				const expected = buyItem.quantity;
				const received = item.quantityReceived;
				const diff = received - expected;

				// 1️⃣ Movimiento de stock (SIEMPRE por lo recibido)
				await StockService.registerMovement({
					stockCode: items.length > 1 ? `${stockCode}-${i + 1}` : stockCode,
					product: item.product,
					quantity: received,
					type: 'IN',
					reason: 'BUY',
					reference: buyId,
					createdBy: receivedBy,
					superUser,
				});

				// 2️⃣ Coleccionar para Ajuste SOLO si es FALTANTE (diff < 0)
				// El modelo solo soporta ajustes negativos (Notas de Crédito)
				if (diff < 0) {
					adjustmentItems.push({
						product: item.product,
						quantity: Math.abs(diff), // Cantidad faltante
						unitAmount: buyItem.unitCost,
						reason: item.observations || 'Faltante en recepción',
					});
				}
			}

			// 3️⃣ Crear Ajuste Agregado si hay faltantes
			if (adjustmentItems.length > 0) {
				const adjCode = await generateDocumentCode({
					tenantId: superUser, // superUser es el ID aquí
					prefix: 'AJU',
				});

				await PurchaseAdjustmentService.create({
					code: adjCode,
					buyId: buy._id,
					type: 'SHORTAGE',
					reason: `Ajuste automático por faltantes en recepción ${receiptCode}`,
					items: adjustmentItems,
					goodsReceiptId: receipt._id,
					userId: receivedBy,
					superUserId: superUser,
				});
			}

			// 4️⃣ Registrar recepción en el historial de la compra
			buy.history.push({
				action: 'GOODS_RECEIVED',
				description: `Recepción de mercadería registrada con código ${receiptCode}`,
				performedBy: receivedBy,
				reference: {
					model: 'GoodsReceipt',
					id: receipt._id,
				},
			});

			await buy.save();
			return receipt;
		} catch (error) {
			console.log(error);
		}
	}

	/* ======================================================
	 * GET BUY DETAIL
	 * ====================================================== */
	static async getBuyDetail(buyId) {
		const buy = await Buy.findById(buyId).lean();
		if (!buy) throw new Error('Buy not found');

		const receipts = await GoodsReceipt.find({ buy: buyId }).lean();

		const orderedByProduct = {};
		buy.items.forEach((i) => {
			orderedByProduct[i.product.toString()] = i.quantity;
		});

		const receivedByProduct = {};
		receipts.forEach((r) => {
			r.items.forEach((i) => {
				const key = i.product.toString();
				receivedByProduct[key] =
					(receivedByProduct[key] || 0) + i.quantityReceived;
			});
		});

		const totalOrdered = Object.values(orderedByProduct).reduce(
			(a, b) => a + b,
			0
		);
		const totalReceived = Object.values(receivedByProduct).reduce(
			(a, b) => a + b,
			0
		);

		let receiptStatus = 'none';
		if (totalReceived > 0 && totalReceived < totalOrdered) {
			receiptStatus = 'partial';
		}
		if (totalReceived >= totalOrdered) {
			receiptStatus = 'complete';
		}

		return {
			...buy,
			receipts,
			receiptStatus,
		};
	}
}

module.exports = PurchaseFlowService;
