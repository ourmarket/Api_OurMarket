const { Schema, model } = require('mongoose');

const ExpenseTemplateItemSchema = new Schema(
	{
		expensesName: {
			type: String,
			required: true,
			trim: true,
			uppercase: true,
		},
		category: {
			type: String,
			default: 'Otros',
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
			default: 0,
		},
		isProrated: {
			type: Boolean,
			default: false,
		},
	},
	{ _id: false }
);

const ExpensesTemplateSchema = new Schema(
	{
		name: {
			type: String,
			required: [true, 'El nombre de la plantilla es obligatorio'],
			trim: true,
		},
		description: {
			type: String,
			default: '',
		},
		items: [ExpenseTemplateItemSchema],
		isDefault: {
			type: Boolean,
			default: false,
		},
		state: {
			type: Boolean,
			default: true,
		},
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	}
);

ExpensesTemplateSchema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();
	return data;
};

module.exports = model('ExpensesTemplate', ExpensesTemplateSchema);
