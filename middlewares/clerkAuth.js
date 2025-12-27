const { User } = require('../models');
const { clerkClient } = require('@clerk/clerk-sdk-node');

const clerkAuth = async (req, res, next) => {
	const clerkId = req.auth.userId;

	if (!clerkId) {
		return res.status(401).json({
			ok: false,
			msg: 'No autenticado',
		});
	}

	// 🔑 Traer usuario desde Clerk
	const clerkUser = await clerkClient.users.getUser(clerkId);

	const email = clerkUser.emailAddresses?.find(
		(e) => e.id === clerkUser.primaryEmailAddressId
	)?.emailAddress;

	if (!email) {
		return res.status(400).json({
			ok: false,
			msg: 'Usuario sin email en Clerk',
		});
	}

	// 🧩 Datos normalizados
	const normalizedEmail = email.toLowerCase();
	const name = clerkUser.firstName || null;
	const lastName = clerkUser.lastName || null;
	const avatar = clerkUser.image || null;

	// 1️⃣ Buscar por clerkId + tenant

	let user = await User.findOne({
		clerkId,
		superUser: req.tenant._id,
		state: true,
	}).populate('role');

	// 2️⃣ Buscar por email + tenant
	if (!user) {
		user = await User.findOne({
			email: normalizedEmail,
			superUser: req.tenant._id,
			state: true,
		}).populate('role');

		// 3️⃣ Linkear cuenta existente
		if (user) {
			user.clerkId = clerkId;

			// ⬇️ completar datos si faltan
			if (!user.name && name) user.name = name;
			if (!user.lastName && lastName) user.lastName = lastName;
			if (!user.avatar && avatar) user.avatar = avatar;
			await user.save();
		}
	}

	// 3️⃣ Crear usuario nuevo
	if (!user) {
		user = await User.create({
			clerkId,
			email: normalizedEmail,
			name,
			lastName,
			avatar,
			superUser: req.tenant._id,
		});
	}

	req.user = user;

	next();
};

module.exports = {
	clerkAuth,
};
