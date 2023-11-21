const { Schema, model } = require('mongoose');

const SuperUserSchema = Schema(
	{
		clientId: { type: String, unique: true },
		version: { type: String }, // [full, lite, dr]
		superUserData: {
			name: { type: String },
			lastName: { type: String },
			phone: { type: String },
			address: { type: String },
			city: { type: String },
			province: { type: String },
			zip: { type: Number },
			lat: { type: Number },
			lng: { type: Number },
		},
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
