const { User } = require('../models');
const { logger } = require('../helpers/logger');


const getMe = async (req, res) => {
	const clerkUserId = req.auth.userId;

	try {
		const user = await User.findOne({ clerkId: clerkUserId }).populate(
			'superUser'
		);

		if (!user) {
			return res.status(404).json({ msg: 'Usuario no encontrado' });
		}

		return res.json({
			user: user._id,
			superUser: user.superUser._id,
			version: user.superUser.version,
			superUserData: user.superUser.superUserData,
		});
	} catch (error) {
		logger.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

module.exports = {
	getMe,
};
