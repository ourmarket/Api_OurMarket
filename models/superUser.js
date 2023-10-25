const { Schema, model } = require('mongoose');

const SuperUserSchema = Schema(
	{
		superUser: { type: String },
		state: {
			type: Boolean,
			default: true,
			required: true,
		},
	},
	{ timestamps: true }
);

SuperUserSchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('SuperUser', SuperUserSchema);
