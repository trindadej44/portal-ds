
   function logout() {
    fetch('/logout', {
        method: 'POST',
        credentials: 'include' // Para enviar cookies
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/'; // Redireciona para a página inicial
        } else {
            console.error('Erro ao fazer logout:', response.statusText);
        }
    })
    .catch(err => console.error('Erro ao fazer logout:', err));
}


    // Abrir o modal quando o botão for clicado
document.getElementById('open-modal-btn').addEventListener('click', () => {
    $('#todoModal').modal('show');
});

// Função para carregar as tarefas
async function loadTasks() {
    try {
        const response = await fetch('/api/todos');
        const tasks = await response.json();

        const taskList = document.getElementById('task-list');
        taskList.innerHTML = ''; // Limpar lista atual

        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.innerHTML = `
                <span>${task.task}</span>
                <button onclick="markAsCompleted(${task.id})" class="btn btn-success btn-sm ml-2">⬜</button>
                <button onclick="deleteTask(${task.id})" class="btn btn-danger btn-sm ml-2">🗑</button>
            `;
            if (task.completed) {
                taskItem.style.textDecoration = 'line-through';
            }
            taskList.appendChild(taskItem);
        });
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
    }
}

// Função para adicionar tarefa
document.getElementById('add-task-btn').addEventListener('click', async () => {
    const taskInput = document.getElementById('new-task');
    const task = taskInput.value;

    if (!task) return alert('Digite uma tarefa!');

    try {
        const response = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task }),
        });

        const newTask = await response.json();
        loadTasks(); // Recarregar lista de tarefas após adicionar
        taskInput.value = ''; // Limpar input
    } catch (error) {
        console.error('Erro ao adicionar tarefa:', error);
    }
});

// Função para marcar tarefa como concluída
async function markAsCompleted(taskId) {
    try {
        const response = await fetch(`/api/todos/${taskId}/completed`, { method: 'PUT' });
        const updatedTask = await response.json();
        loadTasks(); // Recarregar lista de tarefas
    } catch (error) {
        console.error('Erro ao concluir tarefa:', error);
    }
}

// Função para excluir tarefa
async function deleteTask(taskId) {
    try {
        const response = await fetch(`/api/todos/${taskId}`, { method: 'DELETE' });
        loadTasks(); // Recarregar lista de tarefas
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
    }
}

// Carregar as tarefas ao iniciar o modal
$('#todoModal').on('show.bs.modal', loadTasks); // Quando o modal abrir, carregar as tarefas


     // Função para buscar os cursos inscritos
     


     // Create star background
        function createStars() {
            const spaceBackground = document.getElementById('space-bg');
            const numberOfStars = 100;

            for (let i = 0; i < numberOfStars; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.left = `${Math.random() * 100}%`;
                star.style.top = `${Math.random() * 100}%`;
                star.style.animationDelay = `${Math.random() * 2}s`;
                spaceBackground.appendChild(star);
            }
        }

        // Modified fetchEnrolledCourses function
        async function fetchEnrolledCourses() {
            try {
                const response = await fetch('http://localhost:3001/enrolled-courses');
                const courses = await response.json();
                
                const coursesContainer = document.getElementById('courses-container');
                coursesContainer.innerHTML = '';

                if (courses.length === 0) {
                    coursesContainer.innerHTML = `
                        <div class="col-12">
                            <div class="empty-state">
                                <img src="images/navee.gif" alt="No courses" class="img-fluid">
                                <h3>Inicie sua Jornada Espacial!</h3>
                                <p class="text-light">Embarque em uma aventura pelo conhecimento no TecVerso</p>
                                <a href="cursos-ds.html" class="btn btn-space">
                                    <i class="fas fa-rocket mr-2"></i>Explorar Cursos
                                </a>
                            </div>
                        </div>
                    `;
                } else {
                    courses.forEach(course => {
                        const courseCard = document.createElement('div');
                        courseCard.className = 'col-md-4 mb-4';
                        courseCard.innerHTML = `
                            <div class="course-card">
                                <img src="${course.imagem_url}" alt="${course.name}">
                                <h5>${course.name}</h5>
                                <p>${course.description}</p>
                                <div class="course-info">
                                    <span><i class="fas fa-user-astronaut"></i> ${course.instrutor}</span>
                                    <span><i class="fas fa-clock"></i> ${course.duracao}h</span>
                                </div>
                                <a href="curso.html?id=${course.id}" class="btn btn-space btn-block">
                                    <i class="fas fa-space-shuttle mr-2"></i>Continuar Missão
                                </a>
                            </div>
                        `;
                        coursesContainer.appendChild(courseCard);
                    });
                }

                setTimeout(() => {
                    coursesContainer.classList.add('show');
                }, 100);
            } catch (error) {
                console.error('Erro ao buscar cursos:', error);
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            createStars();
            fetchEnrolledCourses();
        });