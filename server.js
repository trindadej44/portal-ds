const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const winston = require('winston');
const path = require('path');
const bodyParser = require('body-parser');
const authRoutes = require('./auth');
const userRoutes = require('./routes/user');
const pool = require('./db'); // Importa o pool do banco de dados
const coursesRouter = require('./api/courses');
const app = express();

app.use('/api/courses', coursesRouter);
// Configuração do bodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuração do logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log' })
  ],
});

// Middleware de sessão
app.use(session({
  secret: 'seu_segredo_aqui',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Configuração do Google OAuth
passport.use(new GoogleStrategy({
  clientID: '655981409354-v5ahse7krnjikbnpk9vge9p7vtg2r7a7.apps.googleusercontent.com',
  clientSecret: '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',
  callbackURL: 'http://localhost:3001/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  const { displayName: name, emails } = profile;
  const email = emails[0].value;

  try {
    // Verificar se o usuário já existe
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userExists.rows.length > 0) {
      // Se o usuário já existe, apenas retorna o usuário
      return done(null, userExists.rows[0]);
    }

    // Caso contrário, insira um novo usuário no banco de dados
    const newUser = await pool.query(
      'INSERT INTO users (name, email, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, email, profile.id] // Usando o ID do perfil do Google
    );

    return done(null, newUser.rows[0]);
  } catch (error) {
    logger.error('Erro ao registrar usuário:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Diretório comum
const commonDirectory = path.join(__dirname);

// Rotas de autenticação
app.use('/auth', authRoutes);
app.use('/api', userRoutes); 

// Rota de login com Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Rota de callback
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Rota para a dashboard
app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    const dashboardData = req.session.user; // Acessa os dados da sessão
    const dashboardPath = path.join(commonDirectory, 'dashboard.html');
    
    // Você pode passar os dados da sessão para o template, se estiver usando um sistema de templates.
    res.sendFile(dashboardPath);
  } else {
    res.redirect('/');
  }
});


// Rota inicial para renderizar index.html
app.get('/', (req, res) => {
  const indexPath = path.join(commonDirectory, 'index.html');
  res.sendFile(indexPath);
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Algo deu errado!');
});

// Servir arquivos estáticos do diretório comum
app.use(express.static(commonDirectory));

// Inicializa o servidor
app.listen(3001, () => {
  console.log('Servidor rodando na porta 3001');
});

app.post('/logout', (req, res) => {
  req.logOut(); // Usar logOut com "O" maiúsculo
  res.redirect('/index.html'); // Redireciona para index.html
});

// Rota para listar cursos disponíveis
app.get('/courses', async (req, res) => {
  try {
    const courses = await pool.query('SELECT * FROM courses');
    res.json(courses.rows); // Retorna todos os cursos como JSON
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ error: 'Erro ao listar cursos' });
  }
});

// Rota para a página de cursos
// Rota para listar cursos disponíveis
app.get('/api/cursos', async (req, res) => {
  try {
      const result = await pool.query('SELECT * FROM cursos');
      res.json(result.rows);
  } catch (err) {
      console.error(err);
      res.status(500).send('Erro ao buscar cursos');
  }
});