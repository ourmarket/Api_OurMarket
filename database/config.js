const mongoose = require('mongoose');

const ensureSuperAdminRole = async () => {
	try {
		const Role = require('../models/role');
		const exists = await Role.findOne({ role: 'SUPER_ADMIN_ROLE' });
		if (!exists) {
			await Role.create({
				role: 'SUPER_ADMIN_ROLE',
				es: 'Super Administrador',
				type: 'employee',
				permissions: ['*'],
				state: true,
			});
			console.log('Rol SUPER_ADMIN_ROLE inicializado');
		}
	} catch (e) {
		console.error('Error al inicializar SUPER_ADMIN_ROLE:', e);
	}
};

const dbConnection = async () => {
	try {
		await mongoose.connect(process.env.MONGODB_CNN);

		console.log('Base de datos online');
		await ensureSuperAdminRole();
	} catch (error) {
		console.log(error);
		throw new Error('Error a la hora de iniciar la base de datos');
	}
};

module.exports = {
	dbConnection,
};
