const { Schema, model } = require('mongoose');

const ConfigSchema = Schema(
	{
		inactiveDays: {
			type: Number,
			default: 20,
		},
		pointsPerReferral: {
			type: Number,
			default: 500, // Puntos que se otorgan al Cliente A por cada referido
		},
		pointsExpirationDays: {
			type: Number,
			default: 90, // Días que duran los puntos antes de vencer
		},
		pointsConversionRate: {
			type: Number,
			default: 10, // Ej: 10 puntos = $1 de descuento
		},
		pointsPerPesoSpent: {
			type: Number,
			default: 1, // Ej: 1 peso gastado = 1 punto
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
