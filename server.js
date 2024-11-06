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
const router = express.Router();
const db = require('./db');


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
      'INSERT INTO users (name, email, id, is_new_user) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, profile.id, true] // Atribui true inicialmente
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

app.get('/courses/add', (req, res) => {
  if (req.isAuthenticated()) {
    const addCoursePath = path.join(commonDirectory, 'add_course.html');
    res.sendFile(addCoursePath);
  } else {
    res.redirect('/');
  }
});

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
      // Verifica se o usuário já curtiu o artigo
      const existingLike = await pool.query(
          'SELECT * FROM likes WHERE user_id = $1 AND article_id = $2',
          [userId, articleId]
      );

      console.log('Existing like:', existingLike.rows);

      if (existingLike.rows.length > 0) {
          return res.status(400).json({ error: 'Você já curtiu este artigo.' });
      }

      // Adiciona o novo like
      await pool.query(
          'INSERT INTO likes (user_id, article_id) VALUES ($1, $2)',
          [userId, articleId]
      );

      console.log('Like adicionado:', { userId, articleId });
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

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/api/ratings', router);

app.post('/api/ratings', async (req, res) => {
  const { course_id, rating } = req.body;
  const userId = req.user.id; // Obtém o ID do usuário autenticado

  try {
    await pool.query(
      'INSERT INTO ratings (course_id, user_id, rating) VALUES ($1, $2, $3)',
      [course_id, userId, rating]
    );
    res.status(201).send('Avaliação adicionada com sucesso!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao adicionar avaliação');
  }
});

app.get('/api/ratings/average/:course_id', async (req, res) => {
  const { course_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT AVG(rating) as average_rating FROM ratings WHERE course_id = $1',
      [course_id]
    );
    res.json(result.rows[0]); // Retorna a média de avaliações
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar avaliações');
  }
});




app.post('/welcome', (req, res) => {
  const { age, position, education } = req.body;
  const userId = req.user.id;

  const query = `
      UPDATE users 
      SET age = $1, desired_position = $2, education = $3, is_new_user = FALSE 
      WHERE id = $4
  `;
  pool.query(query, [age, position, education, userId], (err) => {
      if (err) return res.status(500).send('Error updating user info');
      res.redirect('/dashboard'); // Redireciona para o dashboard
  });
});


app.get('/welcome', (req, res) => {
  if (req.isAuthenticated() && req.user.is_new_user) { // Verifica se o usuário é novo
    const welcomePath = path.join(commonDirectory, 'welcome.html'); // Rendeiriza um HTML com o formulário
    res.sendFile(welcomePath);
  } else {
    res.redirect('/dashboard'); // Redireciona para o dashboard se o usuário não for novo
  }
});

// Rota para salvar informações adicionais do usuário
app.post('/api/users/additional-info', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const userId = req.user.id; // Obtém o ID do usuário autenticado
  const { age, desiredRole, education } = req.body;

  try {
    const query = 'UPDATE users SET age = $1, desired_role = $2, education = $3, is_new_user = false WHERE id = $4';
    await pool.query(query, [age, desiredRole, education, userId]);

    res.status(200).json({ message: 'Informações adicionais salvas com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar informações adicionais:', error);
    res.status(500).json({ error: 'Erro ao salvar informações adicionais.' });
  }
});

app.get('/api/questions', async (req, res) => {
  const { course_id } = req.query;
  const result = await pool.query('SELECT * FROM questions WHERE course_id = $1', [course_id]);
  res.json(result.rows);
});

app.post('/api/unenroll', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const userId = req.user.id; // Obtém o ID do usuário autenticado
  const { course_id } = req.body; // Obtém o ID do curso a partir do corpo da requisição

  try {
    // Executa a query para remover a matrícula
    const query = 'DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2';
    const result = await pool.query(query, [userId, course_id]);

    // Verifica se a matrícula foi encontrada e removida
    if (result.rowCount > 0) {
      res.status(200).json({ message: 'Descadastro realizado com sucesso!' });
    } else {
      res.status(404).json({ error: 'Matrícula não encontrada.' });
    }
  } catch (error) {
    console.error('Erro ao descadastrar:', error);
    res.status(500).json({ error: 'Erro ao realizar descadastro.' });
  }
});

// Rota para desmatricular o usuário de um curso
app.delete('/api/enrollments/:course_id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const userId = req.user.id; // Obtendo o ID do usuário logado
  const courseId = req.params.course_id; // Obtendo o ID do curso a partir da URL

  try {
    // Remove o registro de matrícula do banco de dados
    await pool.query(
      'DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    res.status(200).json({ message: 'Desmatrícula realizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao desmatricular do curso:', error);
    res.status(500).json({ error: 'Erro ao desmatricular do curso' });
  }
});

// Rota para listar todos os alunos e os cursos em que estão inscritos
app.get('/api/dashboard-data', async (req, res) => {

  

  try {
    // Primeira query: usuários e cursos em que estão inscritos
    const userResult = await pool.query(`
      SELECT u.id AS user_id, u.name AS user_name, u.email AS user_email, 
             c.id AS course_id, c.name AS course_name
      FROM users u
      LEFT JOIN enrollments e ON u.id = e.user_id
      LEFT JOIN courses c ON e.course_id = c.id
      ORDER BY u.id, c.id
    `);

    // Organizar os dados no formato desejado
    const usersWithCourses = userResult.rows.reduce((acc, row) => {
      let user = acc.find(u => u.user_id === row.user_id);
      if (!user) {
        user = {
          user_id: row.user_id,
          user_name: row.user_name,
          user_email: row.user_email,
          courses: []
        };
        acc.push(user);
      }
      if (row.course_id) {
        user.courses.push({
          course_id: row.course_id,
          course_name: row.course_name
        });
      }
      return acc;
    }, []);

    // Segunda query: quantidade de alunos por curso
    const courseResult = await pool.query(`
      SELECT c.id AS course_id, c.name AS course_name, COUNT(e.user_id) AS student_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      GROUP BY c.id, c.name
      ORDER BY student_count DESC
    `);

    // Preparar os dados de cursos e contagem de alunos
    const coursesWithStudentCount = courseResult.rows.map(row => ({
      course_id: row.course_id,
      course_name: row.course_name,
      student_count: parseInt(row.student_count, 10)
    }));

    // Enviar os dados combinados para o frontend
    res.json({
      users: usersWithCourses,
      courses: coursesWithStudentCount
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});


app.post('/api/courses', async (req, res) => {
  const { id, name, description, instrutor, duracao, categoria, imagem_url, video_url, video_url_basico, video_url_intermediario, video_url_avancado } = req.body;

  try {
      const result = await pool.query(
          'INSERT INTO courses (id, name, description, instrutor, duracao, categoria, imagem_url, video_url, video_url_basico, video_url_intermediario, video_url_avancado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
          [id, name, description, instrutor, duracao, categoria, imagem_url, video_url, video_url_basico, video_url_intermediario, video_url_avancado]
      );

      res.status(201).json(result.rows[0]); // Retorna o curso criado
  } catch (error) {
      console.error('Erro ao adicionar curso:', error);
      res.status(500).json({ error: 'Erro ao adicionar curso.' });
  }
});


