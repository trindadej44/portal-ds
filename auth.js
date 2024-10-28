const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db'); // Assumindo que você já configurou o pool de conexão
const router = express.Router();

// Rota para cadastrar usuário
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (userExists.rows.length > 0) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await pool.query(
    'INSERT INTO users (name, email, password, is_new_user) VALUES ($1, $2, $3, TRUE) RETURNING *',
    [name, email, hashedPassword]
  );

  req.session.user = {
    id: newUser.rows[0].id,
    name: newUser.rows[0].name,
    is_new_user: true,
    current_courses: newUser.rows[0].current_courses || [],
    completed_courses: newUser.rows[0].completed_courses || []
  };

  res.redirect('/dashboard');
});

// Rota para login de usuário
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
      completed_courses: user.rows[0].completed_courses || [],
      isNewUser: user.rows[0].is_new_user // Armazena o estado de novo usuário
    };

    // Verificar se é o primeiro login
    if (req.session.user.isNewUser) {
      res.redirect('/welcome.html'); // Redireciona para a página de boas-vindas
    } else {
      res.redirect('/dashboard.html'); // Redireciona para a dashboard
    }
  });
});


// Rota para a página de boas-vindas
router.get('/welcome', (req, res) => {
  if (req.isAuthenticated() && req.session.user.is_new_user) {
    return res.render('welcome'); // Renderiza a página de boas-vindas
  }
  res.redirect('/dashboard'); // Se não for novo, redireciona para o dashboard
});

// Rota para atualizar informações do usuário
router.post('/welcome', async (req, res) => {
  const { age, desired_role, education } = req.body;
  const userId = req.session.user.id;

  const query = `
    UPDATE users 
    SET age = $1, desired_role = $2, education = $3, is_new_user = FALSE 
    WHERE id = $4
  `;

  try {
    await pool.query(query, [age, desired_role, education, userId]);
    res.redirect('/dashboard'); // Redireciona para o dashboard após a atualização
  } catch (error) {
    return res.status(500).send('Erro ao atualizar informações do usuário');
  }
});

// Rota para matricular um usuário em um curso
router.post('/enroll', async (req, res) => {
  const { course_id } = req.body; 
  const userId = req.session.user.id;

  try {
    await pool.query('INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)', [userId, course_id]);
    const userCourses = await pool.query('SELECT * FROM courses WHERE id IN (SELECT course_id FROM enrollments WHERE user_id = $1)', [userId]);
    req.session.user.current_courses = userCourses.rows;
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Erro ao matricular no curso:', error);
    res.status(500).json({ error: 'Erro ao se matricular no curso' });
  }
});

// Rota para obter os cursos em que o usuário está matriculado
router.get('/my-courses', async (req, res) => {
  const userId = req.session.user.id;

  try {
    const courses = await pool.query('SELECT * FROM courses WHERE id IN (SELECT course_id FROM enrollments WHERE user_id = $1)', [userId]);
    res.json(courses.rows);
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    res.status(500).json({ error: 'Erro ao buscar cursos' });
  }
});

module.exports = router;
