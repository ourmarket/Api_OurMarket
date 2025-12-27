const { Schema, model } = require('mongoose');

const CounterSchema = new Schema({
	key: {
		type: String,
		required: true,
		unique: true,
	},
	seq: {
		type: Number,
		default: 0,
	},
});

module.exports = model('Counter', CounterSchema);
