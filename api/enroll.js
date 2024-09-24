app.post('/api/enroll', async (req, res) => {
    const { user_id, course_id } = req.body;

    try {
        const query = 'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)';
        await pool.query(query, [user_id, course_id]);

        res.status(201).json({ message: 'Matrícula realizada com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar a matrícula:', error);
        res.status(500).json({ error: 'Erro ao realizar matrícula.' });
    }
});
