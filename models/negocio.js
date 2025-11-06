const { de } = require('date-fns/locale');
const { Schema, model } = require('mongoose');

const NegocioSchema = Schema(
	{
		nombreDueño: {
			type: String,
			default: null,
		},
		nombreNegocio: {
			type: String,
			required: true,
		},
		direccion: {
			type: String,
			required: true,
		},
		telefono: {
			type: String,
			default: null,
		},
		categoria: {
			type: String,
			enum: [
				'polleria',
				'carniceria',
				'almacen',
				'kiosco',
				'supermercado',
				'rotiseria',
				'parrilla',
				'restaurant',
			],
			required: true,
		},
		horarioApertura: {
			type: String,
			default: null,
		},
		horarioCierre: {
			type: String,
			default: null,
		},
		potencial: {
			type: Number,
			enum: [1, 2, 3, 4, 5],
			default: null,
		},
		esCliente: {
			type: Boolean,
			default: false,
		},
		fueVisitado: {
			type: Boolean,
			default: false,
		},
		lat: {
			type: Number,
			default: null,		
		},
		lng: {
			type: Number,
			default: null,		
		},
		informacionAdicional: {
			productosQueCompra: { type: String, default: null },
			productosQueLeInteresan: { type: String , default: null },
			distribuidorActual: { type: String, default: null },
		},

		cargadoPor: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
		state: {
			type: Boolean,
			default: true,
			required: true,
		},
	},
	{ timestamps: true }
);

NegocioSchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('Negocio', NegocioSchema);
