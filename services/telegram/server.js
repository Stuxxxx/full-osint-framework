const express = require('express');
const cors = require('cors');
// const helmet = require('helmet'); // Commenté temporairement
const morgan = require('morgan');
require('dotenv').config();

const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS pour serveur distant
app.use(cors({
    origin: ['http://localhost:3000', 'http://192.168.1.24:3000', '*'], // Autorise votre IP
    credentials: true
}));

// Middleware de logging
app.use(morgan('combined'));

// Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Headers personnalisés pour éviter les erreurs SSL
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
});

// Servir les fichiers statiques
app.use(express.static('frontend'));

// Routes API
app.use('/api/search', searchRoutes);

// Route de santé
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Démarrage
app.listen(PORT, '0.0.0.0', () => { // Important: écouter sur toutes les interfaces
    console.log(`🚀 Serveur démarré sur http://192.168.1.24:${PORT}`);
});