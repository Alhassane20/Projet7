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
// Servir les images pour le formulaire depuis le dossier "upload"
app.use('/uploads', express.static(__dirname + '/uploads'));

// Servir les images reçues depuis le formulaire depuis le dossier "image"
app.use('/image', express.static(__dirname + '/image'));



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

app.post('/api/auth/signup', (req, res,) => { // Créer un utilisateur
  const user = new User({
    ...req.body //Méthode spread fais une copie de tous les elements de req.body
  })
  user.save() //Enregister user dans la base de donnée
    .then(() => res.status(201).json({ message: 'Utilisateur enregistré !' }))
    .catch(error => res.status(400).json({ error }));
});

const jwt = require('jsonwebtoken');
app.post('/api/auth/login', (req, res,) => { // Authentifier un compte
  const user = req.body;
  User.findOne({ email: user.email, password: user.password }) // Récupere le mail et le mdp de la requete
    .then(userFound => {
      if (!userFound) { // Vérifie si les infos sont corrects
        return res.status(401).json({ error: 'Identifiants incorrects' });
      }
      const token = jwt.sign(
        { userId: userFound._id }, 'RANDOM_TOKEN_SECRET',
      ); // Genere un token qui contient l'id de l'utilisateur et une cle secrete
      res.status(200).json({ userId: userFound._id, token });
    })
    .catch(error => {
      res.status(404).json({ error });
      console.error('Error authentification:', error);
    });
});

app.post('/api/books', upload.single('image'), (req, res) => { // Ajouter un livre
  const formData = {

    ...JSON.parse(req.body.book), // Convertir la requete en json
    imageUrl: req.file.path, // Chemin du fichier téléchargé

  };
  const book = new Book(formData); // Créer le livre en lui appliquant les données de la requete

  book.save() // Enregistrer le nouveau livre dans la base
    .then(() => res.status(201).json({ message: 'Livre enregistré !' }))
    .catch(error => res.status(400).json({ error }));
});


app.get('/api/books', (req, res,) => { // Afficher tous les livres
  Book.find() // Rechercher tout les livres de la base
    .then(books => res.status(200).json(books))
    .catch(error => res.status(500).json({ error }));
});

app.get('/api/books/bestrating', (req, res) => { // Afficher les 3 livres les mieux notés 
  Book.find()
    .sort({ averageRating: -1 }) // Tri par ordre décroissant de la note moyenne
    .limit(3) // Limiter les résultats à 3
    .then(books => res.status(200).json(books))
    .catch(error => res.status(500).json({ error }));
});

app.get('/api/books/:id', (req, res) => { // Affiche un livre
  Book.findOne({ _id: req.params.id }) // Recherche un livre de la base avec l'id de la requete
    .then(Book => res.status(200).json(Book))
    .catch(error => res.status(404).json({ error }))
});
app.put('/api/books/:id', upload.single('image'), (req, res) => {// Mettre a jour un livre
  const bookId = req.params.id; // Recuperer l'id du livre de la requete
  const updatedBookData = { ...req.body }; // Copier les nouvelles donnees de la requete
  if (req.file) {
    // Si un fichier est telecharge, met a jour le 'imageUrl' avec le chemin du fichier
    updatedBookData.imageUrl = req.file.path;
  }
  // Methode findByIdAndUpdate pour mettre a jour le livre
  Book.findByIdAndUpdate(bookId, updatedBookData, { new: true })
    .then(updatedBook => {
      if (!updatedBook) {
        // Si le livre n'est pas trouve, erreur 404
        return res.status(404).json({ error: 'Livre non trouvé' });
      }
      res.status(200).json(updatedBook);
    })
    .catch(error => {
      res.status(500).json({ error });
    });
});

const fs = require('fs'); //importer le module fs
app.delete('/api/books/:id', (req, res) => { // Supprimer un livre
  Book.deleteOne({ _id: req.params.id }) // Supprimer le ivre dans la base
    .then(() => {
      fs.unlinkSync(req.body.imageUrl); //Methode du module fs pour supprimer le fichier de l'image
      res.status(200).json({ message: 'Livre et image supprimé !' });
    })
    .catch(error => res.status(400).json({ error }));
});

app.post('/api/books/:id/rating', async (req, res) => { // Noter un livre
  console.log('*******requete*******',req);
  const bookId = req.params.id; // Recuperer l'id du livre dans le corps de la requete
  console.log('BOOKID',bookId);
  console.log(req.body);
  const { userId, grade } = req.body; // Recuperer l'id de l'utilisateur
  if (grade < 0 || grade > 5) {
    return res.status(400).json({ error: 'La note doit être comprise entre 0 et 5.' });
  }
  try {
    const userExists = await User.findById(userId); // Verifier si l'utilisateur existe en ncherchant son id
    if (!userExists) {
      return res.status(401).json({ error: "L'utilisateur associé au livre n'existe pas." });
    }
    const book = await Book.findOne({ // Recuperer les informations du livre a noter avec son id
      _id: bookId
    });
    const alreadyRated = book.ratings.filter(rating => rating.userId.equals(userId)).length > 0;
    // Vérifier si l'utilisateur l'a deja noter
    if (alreadyRated) {
      return res.status(402).json({ error: "L'utilisateur a déjà noté ce livre." });
    }
    // Mettre à jour le livre dans la base de données
    const updatedBook = await Book.findOneAndUpdate( // Maj le livre dans la base
      { _id: bookId },
      {
        $push: { ratings: { userId, grade } }, // Ajoute la nouvelle notation a la liste des notations existantes
        $inc: { averageRating: grade } // Met a jour la note moyenne en incrementant la valeur de la nouvelle note
      },
      { new: true } // Renvoie la version mise à jour du livre
    );
    res.status(200).json(updatedBook);
  } catch (error) {
    res.status(404).json({ error: 'Erreur lors de la notation du livre.' });
  }
});


module.exports = app;