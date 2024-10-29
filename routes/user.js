const express = require('express');
const axios = require('axios'); // Para fazer requisições HTTP
const router = express.Router();
const path = require('path');
const db = require(path.join(__dirname, '../db'));

const RECAPTCHA_SECRET_KEY = '6Ldaw28qAAAAAD7xaMzxBjWNwA69UfwFmV-BD4Uc'; // Coloque sua chave secreta aqui

router.get('/user-info', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('Usuário não autenticado');
    }
    
    const userId = req.session.user.id;
    db.query('SELECT name, email, phone, profile_picture FROM users WHERE id = $1', [userId], (error, results) => {
        if (error) {
            return res.status(500).send('Erro ao buscar informações do usuário');
        }
        res.json(results.rows[0]);
    });
});

router.post('/update-phone', async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('Usuário não autenticado');
    }

    const userId = req.session.user.id;
    const { phone, 'g-recaptcha-response': recaptchaResponse } = req.body;

    // Verificação do reCAPTCHA
    try {
        const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
            params: {
                secret: RECAPTCHA_SECRET_KEY,
                response: recaptchaResponse
            }
        });

        const { success } = response.data;
        if (!success) {
            return res.status(400).send('Falha na verificação do reCAPTCHA');
        }
    } catch (error) {
        return res.status(500).send('Erro ao verificar o reCAPTCHA');
    }

    db.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, userId], (error, results) => {
        if (error) {
            return res.status(500).send('Erro ao atualizar telefone');
        }
        res.send('Telefone atualizado com sucesso');
    });
});

module.exports = router;
