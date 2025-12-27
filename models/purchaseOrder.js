/**
 * PURCHASE ORDER (Orden de Compra)
 * --------------------------------
 * Representa la INTENCIÓN de compra a un proveedor.
 *
 * RESPONSABILIDADES:
 * - Definir productos, cantidades y precios estimados
 * - Pasar por un flujo de aprobación
 * - NO impacta stock
 * - NO genera deuda
 *
 * REGLAS:
 * 1) Puede editarse mientras esté en DRAFT
 * 2) En DRAFT puede estar incompleta
 * 3) Para APPROVED:
 *    - supplier es obligatorio
 *    - debe tener al menos 1 item
 *    - cada item debe tener product + quantity
 * 4) Una vez APPROVED no se modifican items
 * 5) Puede generar una o varias recepciones
 * 6) Puede derivar (o no) en una Buy
 */

const { Schema, model } = require('mongoose');

const PurchaseOrderSchema = new Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},

		supplier: {
			type: Schema.Types.ObjectId,
			ref: 'Supplier',
			required: false, // ⬅️ NO required a nivel schema
		},

		items: [
			{
				product: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
					required: false,
				},
				nameSnapshot: {
					type: 'string',
					required: false,
				},

				quantityOrdered: {
					type: Number,
					min: 1,
					required: false,
				},

				estimatedUnitCost: {
					type: Number,
					min: 0,
				},
			},
		],

		status: {
			type: String,
			enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED', 'CLOSED'],
			default: 'DRAFT',
		},
		statusHistory: [
			{
				status: {
					type: String,
					enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED', 'CLOSED'],
					required: true,
				},
				changedAt: {
					type: Date,
					default: Date.now,
				},
				changedBy: {
					type: Schema.Types.ObjectId,
					ref: 'User',
				},
			},
		],

		notes: String,
		expectedDate: Date,

		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},

		state: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

/**
 * PROTECCIÓN DE INMUTABILIDAD
 * --------------------------
 * Una vez APPROVED, no se pueden modificar items
 */
PurchaseOrderSchema.pre('save', function (next) {
	if (!this.isNew) {
		const modifiedItems = this.isModified('items');
		if (modifiedItems && this.status !== 'DRAFT') {
			return next(new Error('Items cannot be modified once order is approved'));
		}
	}
	next();
});

module.exports = model('PurchaseOrder', PurchaseOrderSchema);
