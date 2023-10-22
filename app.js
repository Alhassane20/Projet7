const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { User, Book } = require('./models/things');


const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});

mongoose.connect('mongodb+srv://seyealhassane:marseille13@cluster0.joownin.mongodb.net/?retryWrites=true&w=majority',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch(() => console.log('Connexion à MongoDB échouée !'));

// Autoriser les requêtes depuis le port 3000 (votre application React)
app.use(cors({
  origin: 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

app.post('/api/auth/signup', (req, res,) => {
    const user = new User({
        ...req.body //Méthode spread fais une copie de tous les elements de req.body
    })
    user.save() //Enregister user dans la base de donnée
        .then(() => res.status(201).json({ message: 'Utilisateur enregistré !' }))
        .catch(error => res.status(400).json({ error }));
  });

  const jwt = require('jsonwebtoken');
  app.post('/api/auth/login', (req, res,) => {
    const user = req.body;
    User.findOne({ email: user.email, password: user.password })
        .then(userFound => {
            if (!userFound) {
                return res.status(401).json({ error: 'Identifiants incorrects' });
            }
            const token = jwt.sign(
                { userId: userFound._id }, 'RANDOM_TOKEN_SECRET',
            );
            res.status(200).json({ userId: userFound._id, token });
        })
        .catch(error => {
            res.status(404).json({ error });
            console.error('Error in checkUser:', error); // Log any errors
        });
  });

module.exports = app;