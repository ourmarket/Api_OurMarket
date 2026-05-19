const mongoose = require('mongoose');
require('dotenv').config();
const { User } = require('./models');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_CNN, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to DB');
        const user = await User.findById('6453b9977456e95e0592385d');
        if (!user) {
            console.log('User not found');
            return;
        }
        console.log('User found:', user.email, 'Google:', user.google, 'Verified:', user.verified);
        
        user.google = true;
        user.verified = true;
        await user.save();
        
        const updatedUser = await User.findById('6453b9977456e95e0592385d');
        console.log('Updated user:', updatedUser.email, 'Google:', updatedUser.google, 'UpdatedAt:', updatedUser.updatedAt);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
