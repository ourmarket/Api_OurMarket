const { Schema, model } = require('mongoose');

const cashierSessionSchema = Schema(
	{
		sessionId: { type: String },
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		role: {
			type: Schema.Types.ObjectId,
			ref: 'Role',
		},
		initialCash: { type: Number },
		finalCash: { type: Number },

		payment: {
			cash: { type: Number, default: 0 },
			transfer: { type: Number, default: 0 },
			debt: { type: Number, default: 0 },
		},

		initDate: { type: Date },
		finishDate: { type: Date },

		localOrder: [String],
		deliveryOrder: [String],

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

cashierSessionSchema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();
	return data;
};

module.exports = model('CashierSession', cashierSessionSchema);
