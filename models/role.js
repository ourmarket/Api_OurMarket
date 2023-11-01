const { Schema, model } = require('mongoose');

const RoleSchema = Schema(
	{
		role: {
			type: String,
			required: [true, 'El rol es obligatorio'],
		},
		type: { type: String }, // [client, employee]
	},
	{ timestamps: true }
);

module.exports = model('Role', RoleSchema);
