const { Schema, model } = require('mongoose');

/**
 * ProductAuditLog
 * ---------------
 * Registro inmutable de auditoría para productos.
 * Registra cambios críticos como precios, promociones y creación.
 */
const ProductAuditLogSchema = new Schema(
	{
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
			index: true,
		},

		action: {
			type: String,
			enum: ['CREATE', 'UPDATE', 'DELETE'],
			required: true,
		},

		/**
		 * Solo campos que cambiaron.
		 * Formato: { [campo]: { from: val1, to: val2 } }
		 */
		changes: {
			type: Schema.Types.Mixed,
			default: {},
		},

		/**
		 * Snapshot explícito de la configuración de precios al momento del log
		 */
		priceSnapshot: {
			price: Number,
			hasOffer: Boolean,
			offerPrice: Number,
			offerFrom: Date,
			offerTo: Date,
		},

		reason: {
			type: String,
			required: true,
			// Ej: MANUAL_UPDATE, PRICE_CORRECTION, PROMOTION, MIGRATION
		},

		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},

		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
			index: true,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: false }, // Inmutable: solo createdAt
	}
);

// El documento es inmutable, por lo que no debería editarse nunca.
ProductAuditLogSchema.pre('save', function (next) {
	if (!this.isNew) {
		return next(new Error('ProductAuditLog is immutable'));
	}
	next();
});

module.exports = model('ProductAuditLog', ProductAuditLogSchema);
