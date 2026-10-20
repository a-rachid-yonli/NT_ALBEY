// server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = {
  verifyToken: (req, res, next) => {
    // Récupère le token dans l'en-tête Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // format "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
    }

    try {
      // Vérifie et décode le token avec la clé secrète
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // on attache les infos de l'utilisateur à la requête
      next(); // on passe à la suite
    } catch (err) {
      return res.status(403).json({ error: 'Token invalide ou expiré.' });
    }
  }
};