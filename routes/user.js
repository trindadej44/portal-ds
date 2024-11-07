const express = require('express');
const axios = require('axios'); // Para fazer requisições HTTP
const multer = require('multer'); // Para manipular uploads de arquivos
const path = require('path');
const router = express.Router();
const db = require(path.join(__dirname, '../db'));

const RECAPTCHA_SECRET_KEY = '6Ldaw28qAAAAAD7xaMzxBjWNwA69UfwFmV-BD4Uc'; // Coloque sua chave secreta aqui

// Configuração do multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Diretório onde as imagens serão salvas
    },
    filename: (req, file, cb) => {
        cb(null, `${req.session.user.id}-${Date.now()}-${file.originalname}`); // Nome do arquivo
    }
});

const upload = multer({ storage });

// Rota para obter informações do usuário
router.get('/user-info', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('Usuário não autenticado');
    }
    
    const userId = req.session.user.id;
    db.query(
        'SELECT name, email, phone, profile_picture, created_at, desired_position, education FROM users WHERE id = $1', 
        [userId], 
        (error, results) => {
            if (error) {
                return res.status(500).send('Erro ao buscar informações do usuário');
            }

            if (results.rows.length === 0) {
                return res.status(404).send('Usuário não encontrado');
            }

            res.json(results.rows[0]);
        }
    );
});

// Rota para atualizar o telefone do usuário
// Rota para atualizar o telefone do usuário
router.post('/update-phone', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('Usuário não autenticado');
    }

    const userId = req.session.user.id;
    const { phone } = req.body; // Não precisamos mais de 'g-recaptcha-response'

    // Atualiza o telefone no banco de dados
    db.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, userId], (error, results) => {
        if (error) {
            return res.status(500).send('Erro ao atualizar telefone');
        }
        res.send('Telefone atualizado com sucesso');
    });
});


// Rota para atualizar a foto de perfil
router.post('/update-profile-picture', upload.single('profilePicture'), (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('Usuário não autenticado');
    }

    const userId = req.session.user.id;
    const profilePicturePath = `uploads/${req.file.filename}`; // Caminho da imagem salva

    // Atualiza o caminho da imagem no banco de dados
    db.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [profilePicturePath, userId], (error) => {
        if (error) {
            return res.status(500).send('Erro ao atualizar foto de perfil');
        }
        res.send('Foto de perfil atualizada com sucesso');
    });
});

module.exports = router;
