const { Schema, model } = require('mongoose');

const ExpensesSchema = Schema(
	{
		expensesName: { type: String },
		category: { type: String },
		amount: { type: Number },
		date: { type: Date },

		state: { type: Boolean, default: true },

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

ExpensesSchema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();

	return data;
};

module.exports = model('Expenses', ExpensesSchema);
