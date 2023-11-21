/* eslint-disable n/no-path-concat */
const { createLogger, transports, format } = require('winston');

const logsFolder = `../logs/`;

const loggerTransports = [
	new transports.File({
		level: 'info',
		filename: `${__dirname}/../logs/logs.log`,
		maxsize: 5120000,
		maxFiles: 5,
	}),
];

const loggerRequestTransports = [
	new transports.File({
		level: 'warn',
		filename: `${__dirname}/../logs/requestWarnings.log`,
		maxsize: 5120000,
		maxFiles: 5,
	}),
	new transports.File({
		level: 'error',
		filename: `${__dirname}/../logs/requestErrors.log`,
		maxsize: 5120000,
		maxFiles: 5,
	}),
];

if (process.env.NODE_ENV !== 'production') {
	loggerTransports.push(new transports.Console());

	loggerRequestTransports.push(
		new transports.File({
			level: 'info',
			filename: `${logsFolder}requestInfo.log`,
		})
	);
}

const redactSensitiveInfo = format((info) => {
	// Copiar el objeto info para evitar modificar el original
	const modifiedInfo = { ...info };

	// Redactar el password si está presente en el objeto body
	if (
		modifiedInfo.meta &&
		modifiedInfo.meta.req &&
		modifiedInfo.meta.req.body
	) {
		if (modifiedInfo.meta.req.body.password) {
			modifiedInfo.meta.req.body.password = '[REDACTED]';
		}
	}

	return modifiedInfo;
});

const logger = createLogger({
	transports: loggerTransports,
	format: format.combine(
		redactSensitiveInfo(), // Aplicar la función de redacción a los logs
		format.timestamp(),
		format.json(),
		format.prettyPrint()
	),
});

const requestLogger = createLogger({
	transports: loggerRequestTransports,
	format: format.combine(
		redactSensitiveInfo(), // Aplicar la función de redacción a los logs
		format.timestamp(),
		format.json(),
		format.prettyPrint()
	),
});

module.exports = {
	logger,
	requestLogger,
	logsFolder,
};
