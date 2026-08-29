const { Schema, model } = require('mongoose');

const ExpensesV2Schema = Schema(
	{
		expensesName: {
			type: String,
			required: [true, 'El nombre del gasto es obligatorio'],
			trim: true,
		},
		category: {
			type: String,
			default: 'Otros',
			trim: true,
		},
		type: {
			type: String,
			enum: ['FIJO', 'VARIABLE'],
			default: 'VARIABLE',
		},
		paymentMethod: {
			type: String,
			enum: ['EFECTIVO', 'TRANSFERENCIA'],
			default: 'EFECTIVO',
		},
		amount: {
			type: Number,
			required: [true, 'El monto es obligatorio'],
			min: [0, 'El monto debe ser positivo'],
		},
		date: {
			type: Date,
			required: [true, 'La fecha es obligatoria'],
		},
		year: {
			type: Number,
		},
		month: {
			type: String,
			trim: true,
		},
		isProrated: {
			type: Boolean,
			default: false,
		},
		source: {
			type: String,
			enum: ['DASHBOARD', 'EXCEL_SYNC'],
			default: 'DASHBOARD',
		},
		syncKey: {
			type: String,
			index: true,
		},
		state: {
			type: Boolean,
			default: true,
		},
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
			index: true,
		},
	},
	{ timestamps: true, collection: 'expenses_v2' }
);

ExpensesV2Schema.index({ superUser: 1, date: -1 });
ExpensesV2Schema.index({ superUser: 1, syncKey: 1 });

ExpensesV2Schema.pre('save', function (next) {
	if (this.date) {
		const d = new Date(this.date);
		if (!this.year) this.year = d.getUTCFullYear();
		if (!this.month) {
			const months = [
				'enero',
				'febrero',
				'marzo',
				'abril',
				'mayo',
				'junio',
				'julio',
				'agosto',
				'septiembre',
				'octubre',
				'noviembre',
				'diciembre',
			];
			this.month = months[d.getUTCMonth()];
		}
	}
	next();
});

ExpensesV2Schema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();
	return data;
};

module.exports = model('ExpensesV2', ExpensesV2Schema);
