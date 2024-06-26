const { Schema, model } = require('mongoose');

const CategorySchema = Schema(
	{
		name: {
			type: String,
			required: true,
		},
		img: {
			type: String,
		},
		state: {
			type: Boolean,
			default: true,
			required: true,
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

CategorySchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('Category', CategorySchema);
