const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator'); // Pour que l'adresse mail soit unique
const bcrypt = require('bcrypt');

const userSchema = mongoose.Schema({
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true}
});

const bookSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Utilisation de mongoose.Schema.Types.ObjectId pour représenter l'identifiant de l'utilisateur
    title:{type: String, required: true},
    author: {type: String, required: true},
    imageUrl: {type: String, required: true},
    year: {type: Number, required: true},
    genre: {type: String, required: true},
    ratings: [{
            userId: { type: mongoose.Schema.Types.ObjectId, required: true },
            grade: { type: Number, required: true}
            }],
    averageRating: {type: Number}
});

userSchema.plugin(uniqueValidator);
bookSchema.plugin(uniqueValidator);

// Avant de sauvegarder un utilisateur, hacher le mot de passe
userSchema.pre('save', async function (next) {
    try {
        if (!this.isModified('password')) { // Vérifier si le mdp est modifie pour eviter de le hasher a nouveau
            return next();
        }
        const hashedPassword = await bcrypt.hash(this.password, 10); // Hasher le mdp
        this.password = hashedPassword; // Maj le mdp hasher
        return next();
    } catch (error) {
        return next(error);
    }
});


const User = mongoose.model('User', userSchema);
const Book = mongoose.model('Book', bookSchema);

// userSchema.methods.findOne = function (email, callback) {
//     return this.model('User').findOne({ email }, callback);
// };

module.exports = { User, Book }; 
// Exporter en tant que modèle mongoose