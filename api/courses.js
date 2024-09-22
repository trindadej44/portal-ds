// routes/courses.js
const express = require('express');
const router = express.Router();
const path = require('path');
const db = require(path.join(__dirname, '../db'));

// Rota para obter todos os cursos
router.get('/', (req, res) => {
    db.query('SELECT * FROM courses', (error, results) => {
        if (error) {
            return res.status(500).send('Erro ao buscar cursos');
        }
        res.json(results.rows); // Retorna todos os cursos
    });
});

module.exports = router;
