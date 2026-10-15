const { Schema, model } = require('mongoose');

const RoleSchema = Schema(
	{
		role: {
			type: String,
			required: [true, 'El rol es obligatorio'],
		},
		type: { type: String }, // [client, employee]
		es: { type: String }, // nombre en español del rol
		permissions: [{ type: String }], // Lista de permisos asignados al rol
		state: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

module.exports = model('Role', RoleSchema);
