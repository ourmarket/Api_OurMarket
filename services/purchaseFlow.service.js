// services/purchaseFlow.service.js

const { PurchaseOrder, Buy } = require('../models');

class PurchaseFlowService {
	/* ======================================================
	 * CREATE BUY
	 * ====================================================== */
	static async createBuy(data) {
		const {
			code,
			purchaseOrderId,
			items: itemsFromData,
			supplier,
			documentNumber,
			date,
			amount,
			createdBy,
			superUser,
		} = data;

		let items = itemsFromData || [];
		if (purchaseOrderId) {
			const po = await PurchaseOrder.findById(purchaseOrderId);
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
			purchaseOrder: purchaseOrderId,
			supplier,
			documentNumber,
			date,
			total: amount,
			items,
			createdBy,
			superUser,
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

		// Actualizar estado general de la compra
		const totalPaid = buy.payments.reduce((acc, p) => acc + p.amount, 0);

		if (totalPaid >= buy.total) {
			buy.status = 'PAID';
		} else if (totalPaid > 0) {
			buy.status = 'PARTIAL';
		} else {
			buy.status = 'PENDING';
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
			APPROVED: ['CLOSED'],
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
}

module.exports = PurchaseFlowService;
