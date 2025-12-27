const { Schema, model } = require('mongoose');

const UserSchema = Schema(
	{
		clerkId: { type: String, index: true },
		email: { type: String, required: true },

		name: { type: String },
		lastName: { type: String },

		phone: { type: String, default: null },

		avatar: {
			type: String,
			default:
				'https://ik.imagekit.io/mrprwema7/user_default_nUfUA9Fxa.png?ik-sdk-version=javascript-1.4.3&updatedAt=1668611498443',
		},

		providers: {
			google: { clerkId: String },
			apple: { clerkId: String },
			facebook: { clerkId: String },
		},

		role: {
			type: Schema.Types.ObjectId,
			ref: 'Role',
			default: '636a6311c2e277ca644463fb',
		},
		superUser: {
			type: Schema.Types.ObjectId,
			ref: 'SuperUser',
			required: true,
		},
		state: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

/* 🔐 EMAIL ÚNICO POR TENANT */
UserSchema.index({ email: 1, superUser: 1 }, { unique: true });

UserSchema.methods.toJSON = function () {
	const { __v, ...user } = this.toObject();
	return user;
};

module.exports = model('User', UserSchema);
