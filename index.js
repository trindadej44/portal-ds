const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = 3001;

// Middleware
app.use(bodyParser.json());
app.use(express.static('PORTAL-SUPER-MASSA'));
app.use(bodyParser.urlencoded({ extended: true }));

// Rotas de autenticação
app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando nasdasa porta ${PORT}`);
});
