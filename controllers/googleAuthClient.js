const { response } = require('express');
const { OAuth2Client } = require('google-auth-library');
const { Client, User, Recommendation } = require('../models');

const googleAuthClient = async (req, res = response) => {
	try {
		const { token, ref, link, tenant } = req.body;

        const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
        const client = new OAuth2Client(clientId);

		// 1. Validar el token de Google
		const ticket = await client.verifyIdToken({
			idToken: token,
			audience: clientId,
		});

		const payload = ticket.getPayload();
		const { email, given_name, family_name, picture, sub } = payload;

        let user = null;
        let clientRecord = null;

        // Si viene 'link', significa que estamos vinculando una cuenta existente desde el TPV
        if (link) {
            clientRecord = await Client.findById(link);
            if (!clientRecord) {
                return res.status(404).json({ ok: false, msg: 'El cliente a vincular no existe' });
            }
            
            // Actualizar el User asociado
            user = await User.findById(clientRecord.user);
            if (user) {
                user.email = email; // Sobrescribir con el correo real
                user.google = true;
                user.verified = true;
                if(picture) user.avatar = picture;

                let finalName = given_name || "";
                let finalLastName = family_name || "";
                if (!family_name && payload.name) {
                    const nameParts = payload.name.trim().split(' ');
                    if (nameParts.length > 1) {
                        finalName = nameParts[0];
                        finalLastName = nameParts.slice(1).join(' ');
                    } else {
                        finalName = payload.name;
                    }
                }

                if (!user.name || user.name === "") user.name = finalName;
                if (!user.lastName || user.lastName === "") user.lastName = finalLastName;
                if (!user.phone || user.phone === null) user.phone = "";

                await user.save();
            }
        } else {
            // Flujo normal: Registro nuevo o inicio de sesión
		    user = await User.findOne({ email });

		    if (!user) {
			    // Crear nuevo usuario si no existe
                let superUserId = null;

                if (ref) {
                    const referrerClient = await Client.findById(ref);
                    if (referrerClient) superUserId = referrerClient.superUser;
                } else if (tenant) {
                    superUserId = tenant;
                } else {
                    const { SuperUser } = require('../models');
                    const admin = await SuperUser.findOne({ state: true });
                    superUserId = admin ? admin._id : null;
                }

                if (!superUserId) {
                    return res.status(400).json({ ok: false, msg: 'No se pudo determinar el tenant (superUser)' });
                }
                let finalName = given_name || "";
                let finalLastName = family_name || "";

                // Si Google no nos da family_name pero sí el 'name' completo, lo intentamos separar por espacios
                if (!family_name && payload.name) {
                    const nameParts = payload.name.trim().split(' ');
                    if (nameParts.length > 1) {
                        finalName = nameParts[0];
                        finalLastName = nameParts.slice(1).join(' ');
                    } else {
                        finalName = payload.name;
                    }
                }

			    user = new User({
				    name: finalName,
				    lastName: finalLastName,
				    email,
				    avatar: picture,
				    google: true,
				    verified: true,
				    id_social: sub,
				    social_provider: 'google',
				    password: '@@@', 
                    superUser: superUserId,
			    });
			    await user.save();

                // Buscar ClientCategory y ClientType por defecto
                const { ClientCategory, ClientType } = require('../models');
                let defaultCategory = await ClientCategory.findOne({ superUser: superUserId });
                let defaultType = await ClientType.findOne({ superUser: superUserId });

                if (!defaultCategory) {
                    defaultCategory = new ClientCategory({ clientCategory: 'General', superUser: superUserId });
                    await defaultCategory.save();
                }
                if (!defaultType) {
                    defaultType = new ClientType({ clientType: 'Minorista', superUser: superUserId });
                    await defaultType.save();
                }

                clientRecord = new Client({
                    user: user._id,
                    superUser: superUserId,
                    clientCategory: defaultCategory._id,
                    clientType: defaultType._id,
                });
                await clientRecord.save();

                // Manejar la Recomendación (ref) solo si es un nuevo registro
                if (ref && ref.toString() !== clientRecord._id.toString()) {
                    const existingRecommendation = await Recommendation.findOne({
                        recommendedClient: clientRecord._id,
                        clientId: ref
                    });

                    if (!existingRecommendation) {
                        const newRecommendation = new Recommendation({
                            clientId: ref, 
                            recommendedClient: clientRecord._id,
                            superUser: clientRecord.superUser
                        });
                        await newRecommendation.save();
                    }
                }

		    } else {
			    // Usuario existe, actualizamos a verificado
			    user.google = true;
			    user.verified = true;
                if(picture) user.avatar = picture;

                let finalName = given_name || "";
                let finalLastName = family_name || "";
                if (!family_name && payload.name) {
                    const nameParts = payload.name.trim().split(' ');
                    if (nameParts.length > 1) {
                        finalName = nameParts[0];
                        finalLastName = nameParts.slice(1).join(' ');
                    } else {
                        finalName = payload.name;
                    }
                }

                if (!user.name || user.name === "") user.name = finalName;
                if (!user.lastName || user.lastName === "") user.lastName = finalLastName;
                if (!user.phone || user.phone === null) user.phone = "";

			    await user.save();

                clientRecord = await Client.findOne({ user: user._id });
                if (!clientRecord) {
                    const { ClientCategory, ClientType } = require('../models');
                    let defaultCategory = await ClientCategory.findOne({ superUser: user.superUser });
                    let defaultType = await ClientType.findOne({ superUser: user.superUser });

                    if (!defaultCategory) {
                        defaultCategory = new ClientCategory({ clientCategory: 'General', superUser: user.superUser });
                        await defaultCategory.save();
                    }
                    if (!defaultType) {
                        defaultType = new ClientType({ clientType: 'Minorista', superUser: user.superUser });
                        await defaultType.save();
                    }

                    clientRecord = new Client({
                        user: user._id,
                        superUser: user.superUser,
                        clientCategory: defaultCategory._id,
                        clientType: defaultType._id,
                    });
                    await clientRecord.save();
                }
		    }
        }

		res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Validación exitosa',
            data: {
                client: clientRecord,
            }
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: 'Error interno del servidor o Token Invalido',
            error: error.message || String(error)
		});
	}
};

module.exports = {
	googleAuthClient,
};
