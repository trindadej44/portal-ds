const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');

const router = express.Router();

// Rota para cadastrar usuário
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Verificar se o email já existe
  const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (userExists.rows.length > 0) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }

  // Criptografar a senha
  const hashedPassword = await bcrypt.hash(password, 10);

  // Inserir o novo usuário no banco de dados
  const newUser = await pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
    [name, email, hashedPassword]
  );

  // Autenticar o usuário
  req.login(newUser.rows[0], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao autenticar usuário' });
    }
    // Redirecionar para a dashboard após registro bem-sucedido
    res.redirect('/cadastro.html');
  });
});

// Rota para login de usuário
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Verificar se o usuário existe
  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (user.rows.length === 0) {
    return res.status(400).json({ error: 'Usuário não encontrado' });
  }

  // Comparar a senha criptografada
  const validPassword = await bcrypt.compare(password, user.rows[0].password);
  if (!validPassword) {
    return res.status(400).json({ error: 'Senha inválida' });
  }

  // Autenticar o usuário
  req.login(user.rows[0], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao autenticar usuário' });
    }
    
    // Criar sessão com informações do usuário
    req.session.user = {
      id: user.rows[0].id,
      name: user.rows[0].name,
      current_courses: user.rows[0].current_courses || [],
      completed_courses: user.rows[0].completed_courses || []
    };

    // Redirecionar para a dashboard após login bem-sucedido
    res.redirect('/dashboard');
  });
});

// Rota para matricular um usuário em um curso
router.post('/enroll', async (req, res) => {
  const { course_id } = req.body; // O ID do curso vem da requisição
  const userId = req.session.user.id; // Pega o ID do usuário da sessão

  try {
    // Inserir matrícula na tabela enrollments
    await pool.query('INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)', [userId, course_id]);

    // Atualizar a sessão do usuário com o novo curso matriculado
    const userCourses = await pool.query('SELECT * FROM courses WHERE id IN (SELECT course_id FROM enrollments WHERE user_id = $1)', [userId]);
    req.session.user.current_courses = userCourses.rows;

    res.redirect('/dashboard'); // Redireciona o usuário de volta à dashboard
  } catch (error) {
    console.error('Erro ao matricular no curso:', error);
    res.status(500).json({ error: 'Erro ao se matricular no curso' });
  }
});

// Rota para obter os cursos em que o usuário está matriculado
router.get('/my-courses', async (req, res) => {
  const userId = req.session.user.id; // Pega o ID do usuário da sessão

  try {
    // Selecionar todos os cursos do usuário
    const courses = await pool.query('SELECT * FROM courses WHERE id IN (SELECT course_id FROM enrollments WHERE user_id = $1)', [userId]);
    res.json(courses.rows); // Retorna os cursos como JSON
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    res.status(500).json({ error: 'Erro ao buscar cursos' });
  }
});

module.exports = router;
