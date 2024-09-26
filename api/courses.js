// routes/courses.js
const express = require('express');
const router = express.Router();
const path = require('path');
const db = require(path.join(__dirname, '../db')); // Certifique-se de que o caminho está correto

// Rota para obter todos os cursos
router.get('/', (req, res) => {
    db.query('SELECT * FROM courses', (error, results) => {
        if (error) {
            return res.status(500).send('Erro ao buscar cursos');
        }
        res.json(results.rows); // Retorna todos os cursos
    });
});

// Rota para obter o conteúdo de um curso específico
router.get('/course-content', (req, res) => {
    const courseId = parseInt(req.query.id); // Obtém o ID do curso a partir da query string

    db.query('SELECT * FROM courses WHERE id = $1', [courseId], (error, results) => {
        if (error) {
            return res.status(500).send('Erro ao buscar conteúdo do curso');
        }
        if (results.rows.length > 0) {
            res.json(results.rows[0]); // Retorna o curso como JSON
        } else {
            res.status(404).json({ message: 'Curso não encontrado' }); // Retorna 404 se não encontrar
        }
    });
});

module.exports = router;
