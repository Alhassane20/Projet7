const multer = require('multer');

// Configuration de Multer pour stocker les fichiers téléchargés dans le dossier 'image'
const storage = multer.memoryStorage({
    destination: (req, file, callback) => {
      callback(null, 'image'); // Dossier de destination pour les fichiers téléchargés
    },
    filename: (req, file, callback) => {
      callback(null, Date.now() + '-' + file.originalname); // Nom de fichier unique basé sur le timestamp
    },
  });
  // Créez une instance de middleware Multer avec la configuration
  const upload = multer({ storage: storage });
  // Utiliser Multer comme middleware pour gérer le téléchargement de fichiers

  module.exports = upload;