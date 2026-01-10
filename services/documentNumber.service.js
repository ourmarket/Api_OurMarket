const { Counter } = require('../models');

async function generateDocumentCode({ tenantId, prefix }) {
	const year = new Date().getFullYear();
	const key = `${tenantId}-${prefix}-${year}`;

	const counter = await Counter.findOneAndUpdate(
		{ key },
		{ $inc: { seq: 1 } },
		{ new: true, upsert: true }
	);

	const number = String(counter.seq).padStart(3, '0');

	return `${prefix}-${year}-${number}`;
}

module.exports = {
	generateDocumentCode,
};
