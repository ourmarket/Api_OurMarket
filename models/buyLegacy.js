/**
 * BUY (Compra a proveedor)
 * ------------------------
 * Representa el INGRESO de mercadería al sistema.
 *
 * REGLAS CLAVE:
 * 1) BUY NO maneja stock directamente.
 *    - BUY solo registra el hecho histórico de la compra.
 *    - El stock se impacta mediante StockMovement.
 *
 * 2) BUY es INMUTABLE en sus items.
 *    - quantity y unitCost NO deben editarse una vez creada.
 *    - Si hay errores, se debe generar un ajuste (nuevo movimiento).
 *
 * 3) Los costos son HISTÓRICOS.
 *    - unitCost es el costo real pagado en ese momento.
 *    - Nunca se recalcula ni se actualiza.
 *
 * 4) El total es un VALOR CERRADO.
 *    - total = sum(items.quantity * items.unitCost)
 *    - Se guarda por razones contables e históricas.
 *
 * 5) El estado de pago es DERIVADO.
 *    - paidAmount = cash + transfer
 *    - PENDING  → paidAmount === 0
 *    - PARTIAL  → paidAmount < total
 *    - PAID     → paidAmount >= total
 *
 * 6) BUY no conoce ni consulta el stock actual.
 *    - Solo indica cuánto INGRESA.
 *
 * FLUJO:
 * - Se crea BUY
 * - Por cada item se genera un StockMovement (+quantity, reason: BUY)
 */

const { Schema, model } = require('mongoose');

//Modelo antiguo
const BuyLegacySchema = Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: 'User' },
		supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
		quantityProducts: { type: Number },
		total: { type: Number },

		payment: {
			cash: { type: Number, default: 0 },
			transfer: { type: Number, default: 0 },
			debt: { type: Number, default: 0 },
		},

		products: [
			{
				productId: {
					type: Schema.Types.ObjectId,
					ref: 'ProductLegacy',
					required: true,
				},
				stockId: { type: String },
				name: { type: String },
				img: { type: String },

				quantity: { type: Number },
				unitCost: { type: Number },
				totalCost: { type: Number },
			},
		],

		paid: { type: Boolean, default: false },

		state: { type: Boolean, default: true, required: true },

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
	},
	{ timestamps: true }
);

BuyLegacySchema.methods.toJSON = function () {
	const { __v, state, ...data } = this.toObject();
	return data;
};

module.exports = model('BuyLegacy', BuyLegacySchema);
