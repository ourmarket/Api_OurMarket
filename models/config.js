const { Schema, model } = require('mongoose');

const ConfigSchema = Schema(
	{
		inactiveDays: {
			type: Number,
			default: 20,
		},

		state: {
			type: Boolean,
			default: true,
		},
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

ConfigSchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('Config', ConfigSchema);
