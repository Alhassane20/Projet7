const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator'); // Pour que l'adresse mail soit unique

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


const User = mongoose.model('User', userSchema);
const Book = mongoose.model('Book', bookSchema);

// userSchema.methods.findOne = function (email, callback) {
//     return this.model('User').findOne({ email }, callback);
// };

module.exports = { User, Book }; 
// Exporter en tant que modèle mongoose