/* eslint-disable n/no-path-concat */
const { createLogger, transports, format } = require('winston');

const logsFolder = `../logs/`;

const loggerTransports = [
	// Define los transportes para el logger principal
	new transports.File({
		level: 'info',
		filename: `${__dirname}/../logs/logs.log`,
		maxsize: 5120000,
		maxFiles: 5,
	}),
];

const requestLoggerTransports = [
	// Define los transportes para el logger de solicitudes
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

// Define los transportes para el nuevo logger de operaciones del controlador
const controllerLoggerTransports = [
	new transports.File({
		level: 'info', // Puedes ajustar el nivel según tus necesidades
		filename: `${__dirname}/../logs/controllerOperations.log`,
		maxsize: 5120000,
		maxFiles: 5,
	}),
];

// Define una función para redactar información sensible, si es necesario
const redactSensitiveInfo = format((info) => {
	// Implementa la lógica de redacción según tus necesidades
	return info;
});

// Define el formato para los logs
const loggerFormat = format.combine(
	redactSensitiveInfo(), // Si es necesario
	format.timestamp(),
	format.json(),
	format.prettyPrint()
);

// Crea el logger principal
const logger = createLogger({
	transports: loggerTransports,
	format: loggerFormat,
});

// Crea el logger para las solicitudes
const requestLogger = createLogger({
	transports: requestLoggerTransports,
	format: loggerFormat,
});

// Crea el logger para las operaciones del controlador
const controllerLogger = createLogger({
	transports: controllerLoggerTransports,
	format: loggerFormat,
});

module.exports = {
	logger,
	requestLogger,
	controllerLogger, // Exporta el nuevo logger
	logsFolder,
};
