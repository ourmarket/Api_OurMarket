const { Schema, model } = require('mongoose');

const DeliveryZoneSchema = Schema({
	name: { type: String },
	cost: { type: String },
	province: { type: String },
	city: { type: String },
	zip: { type: String },

	limits: [
		{
			north: { type: String },
			south: { type: String },
			east: { type: String },
			west: { type: String },
		},
	],
	mapLimits: [
		{
			lat: { type: Number },
			lng: { type: Number },
		},
	],

	fillColor: { type: String },

	state: { type: Boolean, default: true, required: true },
	superUser: {
		type: Schema.Types.ObjectId,
		ref: 'SuperUser',
		required: true,
	},
});

DeliveryZoneSchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('DeliveryZone', DeliveryZoneSchema);
