const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const upload = require('./middlewares/multer')
const sharp = require('sharp'); // Importer la dépendance Sharp
const fs = require('fs'); //importer le module fs
const { User, Book } = require('./models/things');
const authMiddleware = require('./middlewares/auth');
const bcrypt = require('bcrypt');


const app = express();
app.use(express.json());

const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
}

// Servir les images reçues depuis le formulaire depuis le dossier "image"
app.use('/image', express.static(path.join(__dirname, 'image')));

app.use((req, res, next) => { // autoriser les requetes provenant de differentes origines
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

const jwt = require('jsonwebtoken'); // importer la bibliotheque jsonwebtoken
app.post('/api/auth/login', (req, res) => {
  const user = req.body;
  User.findOne({ email: user.email })
    .then(userFound => {
      if (!userFound) {
        return res.status(401).json({ error: 'Identifiants incorrects' });
      }
      // Comparaison du mot de passe fourni avec le mot de passe haché
      bcrypt.compare(user.password, userFound.password)
        .then(validPassword => {
          if (!validPassword) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
          }
          const token = jwt.sign(
            { userId: userFound._id },
            'RANDOM_TOKEN_SECRET'
          );
          res.status(200).json({ userId: userFound._id, token });
        })
        .catch(error => {
          res.status(500).json({ error });
        });
    })
    .catch(error => {
      res.status(404).json({ error });
      console.error('Error authentication:', error);
    });
});
app.post('/api/books', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    // Utiliser Sharp pour optimiser l'image téléchargée
    const optimizedImageBuffer = await sharp(req.file.buffer)
      .webp({ quality: 20 }) // Converti en format WebP avec une qualité de 20%
      .toBuffer();
    // Créer un nom de fichier unique pour cette image
    const uniqueFilename = Date.now() + '-' + req.file.originalname + '.webp';
    // Enregistrer l'image optimisée dans le dossier "image"
    fs.writeFile(path.join(__dirname, 'image', uniqueFilename), optimizedImageBuffer, err => {
      if (err) {
        console.error("Erreur lors de l'enregistrement de l'image optimisée :", err);
        return res.status(400).json({ error: "Erreur lors de l'enregistrement de l'image optimisée" });
      }
      // Récupérer les données du livre depuis la requête
      const bookData = JSON.parse(req.body.book);
      bookData.imageUrl = 'http://localhost:4000/image/' + uniqueFilename;
      // Créer un nouveau livre avec les données
      const book = new Book(bookData);
      // Enregistrer le nouveau livre dans la base de données
      book.save()
        .then(() => res.status(201).json({ message: 'Livre enregistré !' }))
        .catch(error => res.status(400).json({ error }));
    });
  } catch (error) {
    res.status(400).json({ error: 'Erreur lors de l\'optimisation de l\'image' });
  }
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

app.put('/api/books/:id', authMiddleware, upload.single('image'), async (req, res) => {
  const bookId = req.params.id; // Récupérer l'ID du livre de la requête
  const updatedBookData = { ...req.body }; // Copier les nouvelles données de la requête

  try { // Mettre à jour l'image du livre avec la nouvelle image optimisée
    if (req.file) {
      const optimizedImageBuffer = await sharp(req.file.buffer) // Utiliser optimizedImageBuffer à la place de req.file.path
        .webp({ quality: 20 })
        .toBuffer();
    }
    // Methode findByIdAndUpdate pour mettre à jour le livre
    Book.findByIdAndUpdate(bookId, updatedBookData, { new: true })
      .then(updatedBook => {
        if (!updatedBook) {
          // Si le livre n'est pas trouvé, renvoyer une erreur 404
          return res.status(404).json({ error: 'Livre non trouvé' });
        }
        res.status(200).json(updatedBook);
      })
      .catch(error => {
        res.status(500).json({ error });
      });
  } catch (error) {
    res.status(400).json({ error: 'Erreur lors de l\'optimisation de l\'image' });
  }
});

app.delete('/api/books/:id', authMiddleware, (req, res) => { // Supprimer un livre
  Book.findByIdAndDelete(req.params.id)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ error: 'Livre non trouvé' });
      }
      const imagePath = path.join(__dirname, 'image', path.basename(book.imageUrl)); // Utiliser path.join pour construire le chemin absolu
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error(err); // Afficher les erreurs dans la console
          return res.status(500).json({ error: "Erreur lors de la suppression de l'image" });
        }
        res.status(200).json({ message: 'Livre et image supprimés !' });
      });
    })
    .catch(error => res.status(400).json({ error }));
});


app.post('/api/books/:id/rating', authMiddleware, async (req, res) => {
  const bookId = req.params.id;
  const userId = req.body.userId;
  const grade = req.body.rating;
  if (grade < 0 || grade > 5) {
    return res.status(400).json({ error: 'La note doit être comprise entre 0 et 5.' });
  }
  try {
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(400).json({ error: "L'utilisateur associé au livre n'existe pas." });
    }
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Livre non trouvé.' });
    }
    // Vérifier si l'utilisateur a déjà évalué ce livre
    const alreadyRated = book.ratings.find((rating) => rating.userId == userId);
    if (alreadyRated) {
      return res.status(400).json({ error: "L'utilisateur a déjà noté ce livre." });
    }
    // Calcul de la nouvelle moyenne
    const numberOfRatings = book.ratings.length; // nombre de notations dans le livre
    const currentTotal = book.averageRating * numberOfRatings; // note moyenne multiplie par le nombres de notes
    const newTotal = currentTotal + grade; // ajout d'une nouvelle note dans la moyenne
    const newAverage = newTotal / (numberOfRatings + 1); // divise le nouveau total des évaluations par le nombre total d'évaluations + 1

    // Ajout de la nouvelle évaluation
    book.ratings.push({ userId, grade }); // ajoute une nouvelle évaluation dans la ratings du livre
    book.averageRating = newAverage; // met a jour la moyenne calculée

    // Sauvegarde du livre mis à jour
    const updatedBook = await book.save();

    res.status(200).json(updatedBook);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du calcul de la moyenne d\'évaluation.' });
  }
});



module.exports = app;