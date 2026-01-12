const allowedOrigins = require('./allowedOrigins');

const corsOptions = {
	origin: (origin, callback) => {
		if (!origin) return callback(null, true);

		const { hostname } = new URL(origin);

		if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
			return callback(null, true);
		}

		const allowed = allowedOrigins.some((p) => p.test(hostname));

		if (allowed) return callback(null, true);

		return callback(new Error('Not allowed by CORS'));
	},
	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
	credentials: true,
};

module.exports = corsOptions;
