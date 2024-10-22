// routes/user.js
const express = require('express');
const router = express.Router();
const path = require('path');
const db = require(path.join(__dirname, '../db'));

// routes/user.js
// routes/user.js
// routes/user.js
router.get('/user-info', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('Usuário não autenticado');
    }
    
    const userId = req.session.user.id; // Obter ID do usuário da sessão
    db.query('SELECT name, email, phone, profile_picture FROM users WHERE id = $1', [userId], (error, results) => {
        if (error) {
            return res.status(500).send('Erro ao buscar informações do usuário');
        }
        res.json(results.rows[0]); // Retorna as informações do usuário, agora com a imagem
    });
});



// routes/user.js

router.post('/update-phone', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('Usuário não autenticado');
    }

    const userId = req.session.user.id;
    const { phone } = req.body;

    db.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, userId], (error, results) => {
        if (error) {
            return res.status(500).send('Erro ao atualizar telefone');
        }
        res.send('Telefone atualizado com sucesso');
    });
});


module.exports = router;
