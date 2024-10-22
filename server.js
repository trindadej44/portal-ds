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
const multer = require('multer');
const fs = require('fs');

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
      'INSERT INTO users (name, email, id) VALUES ($1, $2, $3) RETURNING *',
      [name, email, profile.id] // Usando o ID do perfil do Google
    );

    return done(null, newUser.rows[0]);
  } catch (error) {
    logger.error('Erro ao registrar usuário:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id); // Salva apenas o ID do usuário
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]); // Aqui, você pode precisar mudar para a estrutura do seu banco
    done(null, user.rows[0]);
  } catch (error) {
    done(error);
  }
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

// Rota de logout
app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao fazer logout' });
    }
    res.clearCookie('connect.sid'); // Limpa o cookie da sessão
    return res.status(200).json({ message: 'Logout bem-sucedido' });
  });
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

// Para obter o ID do usuário
app.get('/enrolled-courses', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const userId = req.user.id; // Agora acessando o ID corretamente

  try {
    const enrolledCourses = await pool.query(
      'SELECT courses.* FROM enrollments JOIN courses ON enrollments.course_id = courses.id WHERE enrollments.user_id = $1',
      [userId]
    );

    res.json(enrolledCourses.rows); // Retorna os cursos inscritos
  } catch (err) {
    console.error('Erro ao buscar cursos inscritos:', err);
    res.status(500).json({ error: 'Erro ao buscar cursos inscritos' });
  }
});

// Rota para inscrever o usuário em um curso
app.post('/api/enroll', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const userId = req.user.id; // Obtendo o ID do usuário logado
  const { course_id } = req.body; // Obtém o ID do curso a partir do corpo da requisição

  try {
    const query = 'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)';
    await pool.query(query, [userId, course_id]); // Usando o ID do usuário logado

    res.status(201).json({ message: 'Matrícula realizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar a matrícula:', error);
    res.status(500).json({ error: 'Erro ao realizar matrícula.' });
  }
});

app.get('/api/cursos/:id/modulos', async (req, res) => {
  const { id } = req.params;
  const result = await db.query('SELECT * FROM modulos WHERE id_curso = $1', [id]);
  res.json(result.rows);
});


const { exec } = require('child_process');


app.use(express.json());

app.post('/api/run-code', (req, res) => {
    const code = req.body.code;

    // Salvar o código em um arquivo temporário
    const fs = require('fs');
    const tempFile = 'temp_code.py';
    fs.writeFileSync(tempFile, code);

    exec(`python3 ${tempFile}`, (error, stdout, stderr) => {
        if (error) {
            return res.json({ output: stderr });
        }
        res.json({ output: stdout });
    });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/'; // Diretório de uploads
    // Verifica se a pasta de upload existe, se não, cria
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir); // Define o diretório para armazenar os arquivos
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nome único para cada arquivo
  }
});

const upload = multer({ storage: storage });

// Endpoint para atualizar a foto de perfil
app.post('/api/update-profile-picture', upload.single('profilePicture'), async (req, res) => {
  // Verifica se o arquivo foi enviado
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const filePath = req.file.path; // Caminho do arquivo enviado
  const userId = req.user.id; // Obtém o ID do usuário autenticado da sessão

  // Tenta atualizar o caminho da imagem no banco de dados
  try {
    const query = 'UPDATE users SET profile_picture = $1 WHERE id = $2';
    const values = [filePath, userId];

    await pool.query(query, values); // Executa a query para atualizar o banco de dados

    res.status(200).json({ message: 'Foto de perfil atualizada com sucesso!', filePath });
  } catch (error) {
    console.error('Erro ao atualizar a foto de perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar a foto de perfil.' });
  }
});

app.post('/api/comments', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { articleId, content } = req.body;
  const userId = req.user.id; // Obtém o ID do usuário autenticado

  try {
    const result = await pool.query(
      'INSERT INTO comments (user_id, article_id, content) VALUES ($1, $2, $3) RETURNING *',
      [userId, articleId, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ error: 'Erro ao criar comentário' });
  }
});

app.post('/api/articles', upload.single('image'), async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { title, content } = req.body; // Obtém os dados do corpo da requisição
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  const imageUrl = req.file ? req.file.path : null; // Obtém o caminho da imagem se existir

  try {
    const result = await pool.query(
      'INSERT INTO articles (user_id, title, content, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, title, content, imageUrl]
    );
    res.status(201).json(result.rows[0]); // Retorna o artigo criado
  } catch (error) {
    console.error('Erro ao criar artigo:', error);
    res.status(500).json({ error: 'Erro ao criar artigo' });
  }
});


app.get('/api/articles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT articles.*, 
             users.name AS author_name,
             (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) AS like_count
      FROM articles 
      JOIN users ON articles.user_id = users.id
      ORDER BY articles.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar artigos:', error);
    res.status(500).json({ error: 'Erro ao buscar artigos' });
  }
});


app.post('/api/articles/:id/like', async (req, res) => {
    const userId = req.user.id;
    const articleId = req.params.id;

    try {
        await pool.query(
            'INSERT INTO likes (user_id, article_id) VALUES ($1, $2)',
            [userId, articleId]
        );
        res.status(201).json({ message: 'Artigo curtido com sucesso!' });
    } catch (error) {
        console.error('Erro ao curtir artigo:', error);
        res.status(500).json({ error: 'Erro ao curtir artigo' });
    }
});



app.post('/api/comments', async (req, res) => {
  const { userId, articleId, content } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO comments (user_id, article_id, content) VALUES ($1, $2, $3) RETURNING *',
      [userId, articleId, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ error: 'Erro ao criar comentário' });
  }
});

app.get('/api/comments/:articleId', async (req, res) => {
  const { articleId } = req.params;

  try {
    const result = await pool.query(`
      SELECT comments.*, users.name AS commenter_name 
      FROM comments 
      JOIN users ON comments.user_id = users.id 
      WHERE article_id = $1
      ORDER BY comments.created_at ASC
    `, [articleId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ error: 'Erro ao buscar comentários' });
  }
});
