const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { User, Book } = require('./models/things');


const app = express();
app.use(express.json());

// Configuration de Multer pour stocker les fichiers téléchargés dans le dossier 'images'
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'image'); // Dossier de destination pour les fichiers téléchargés
  },
  filename: (req, file, callback) => {
    callback(null, Date.now() + '-' + file.originalname); // Nom de fichier unique basé sur le timestamp
  },
});
// Créez une instance de middleware Multer avec la configuration
const upload = multer({ storage: storage });
// Utilisez Multer comme middleware pour gérer le téléchargement de fichiers

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

// Route pour créer un nouveau livre
app.post('/api/books', upload.single('image'), (req, res) => {
  const bookData = {
    ...req.body,
    imageUrl: req.file.path, // Utilisez le chemin du fichier téléchargé
  };

  const book = new Book(bookData);

  book.save()
    .then(() => res.status(201).json({ message: 'Livre enregistré !' }))
    .catch(error => res.status(400).json({ error }));
});

app.get('/api/books', (req, res,) => {
  Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(500).json({ error }));
});

app.get('/api/books/bestrating', (req, res) => {
  Book.find()
    .sort({ averageRating: -1 }) // Tri par ordre décroissant de la note moyenne
    .limit(3) // Limiter les résultats à 3
    .then(books => res.status(200).json(books))
    .catch(error => res.status(500).json({ error }));
});

app.put('/api/books/:id', upload.single('image'), (req, res) => {// Route pour mettre à jour un livre
  const bookId = req.params.id; // Récupérer l'identifiant du livre depuis les paramètres de la requête
  const updatedBookData = { ...req.body }; // Copier les données du corps de la requête
  if (req.file) {
    // Si un fichier est téléchargé, mettre à jour le champ 'imageUrl' avec le chemin du fichier
    updatedBookData.imageUrl = req.file.path;
  }
  // Utiliser la méthode 'findByIdAndUpdate' de Mongoose pour mettre à jour le livre
  Book.findByIdAndUpdate(bookId, updatedBookData, { new: true })
    .then(updatedBook => {
      if (!updatedBook) {
        // Si le livre n'est pas trouvé, renvoyer une réponse d'erreur 404
        return res.status(404).json({ error: 'Livre non trouvé' });
      }
      // Si la mise à jour est réussie, renvoyer le livre mis à jour en réponse
      res.status(200).json(updatedBook);
    })
    .catch(error => {
      // En cas d'erreur, renvoyer une réponse d'erreur 500
      res.status(500).json({ error });
    });
});

app.get('/api/books/:id', (req, res) => {
  Book.findOne({ _id: req.params.id })
    .then(Book => res.status(200).json(Book))
    .catch(error => res.status(404).json({ error }))
});

const fs = require('fs'); //importer le module fs
app.delete('/api/books/:id', (req, res) => {
  Book.deleteOne({ _id: req.params.id })
    .then(() => {
      fs.unlinkSync(req.body.imageUrl); //Méthode du module fs qui est utilisée pour supprimer un fichier
      res.status(200).json({ message: 'Livre et image supprimé !' });
    })
    .catch(error => res.status(400).json({ error }));
});

app.post('/api/books/:id/rating', (req, res) => {
  const bookId = req.params.id; //Id du livre
  const { userId, grade } = req.body; //'ID de l'utilisateur et la note
  if (grade < 0 || grade > 5) {
    return res.status(400).json({ error: 'La note doit être comprise entre 0 et 5.' });
  } // Erreur si la note n'est pas comprise entre 0 et 5
  const alreadyRated = Book.findOne({ _id: bookId, 'ratings.userId': userId }); //Cherche un livre avec un id specifique et ou ou l'userid a deja note
  if (alreadyRated) { //Erreur si l'utilisateur a deja note
    return res.status(400).json({ error: 'L\'utilisateur a déjà noté ce livre.' });
  }
  const updatedBook = Book.findOneAndUpdate(// Met à jour le livre dans la base de données
    { _id: bookId },
    {
      $push: { ratings: { userId, grade } }, //Ajouter un nouvel userId et un nouveau grade a ratings
      $inc: { averageRating: grade }, //Ajuste la note moyenne avec un nouveau grade
    },
    { new: true } // Pour retourner le document mis à jour
  )
    .then(updatedBook => { res.status(200).json(updatedBook); })
    .catch(error => { res.status(404).json({ error }); });
});

module.exports = app;