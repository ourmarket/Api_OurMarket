function calculateReceiptStatus(buy, receipts) {
	if (!receipts || receipts.length === 0) return 'NONE';

	const orderedByProduct = {};
	buy.items.forEach((item) => {
		orderedByProduct[item.product.toString()] = item.quantity;
	});

	const receivedByProduct = {};
	receipts.forEach((receipt) => {
		receipt.items.forEach((item) => {
			const productId = item.product.toString();
			receivedByProduct[productId] =
				(receivedByProduct[productId] || 0) + item.quantityReceived;
		});
	});

	let hasPartial = false;

	for (const productId in orderedByProduct) {
		const ordered = orderedByProduct[productId];
		const received = receivedByProduct[productId] || 0;

		if (received < ordered) {
			hasPartial = true;
		}
	}

	return hasPartial ? 'PARTIAL' : 'COMPLETE';
}

module.exports = { calculateReceiptStatus };
