const convertToDate = (fechaString) => {
	const partes = fechaString.split('-');
	// El formato es MM-DD-YYYY, así que usamos partes[2] para el año, partes[0] para el mes y partes[1] para el día
	return new Date(partes[2], partes[0] - 1, partes[1]);
};

module.exports = {
	convertToDate,
};
