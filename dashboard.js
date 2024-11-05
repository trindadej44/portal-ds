
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
     


     async function fetchEnrolledCourses() {
        try {
            const response = await fetch('http://localhost:3001/enrolled-courses');
            const courses = await response.json();
            
            const coursesContainer = document.getElementById('courses-container');
            coursesContainer.innerHTML = ''; // Limpa o container
    
            // Verifica se existem cursos
            if (courses.length === 0) {
                const noCoursesMessage = document.createElement('div');
                noCoursesMessage.className = 'col-12 text-center'; // Adiciona classe para centralizar
                noCoursesMessage.innerHTML = `
                    <h3>Ops, nenhum curso ainda!</h3>
                    <p>Você pode se matricular no menu ao lado esquerdo da sua tela, na opção "Cursos Disponíveis"</p>
                    <br>
                    <img src="images/navee.gif" alt="Imagem informativa" class="img-fluid" style="max-width: 200px; margin-top: 10px;">
                `; // Mensagem com a imagem
                
                coursesContainer.appendChild(noCoursesMessage);
            } else {
                // Cria um card para cada curso
                courses.forEach(course => {
                    const courseCard = document.createElement('div');
                    courseCard.className = 'col-md-4 mb-4';
                    courseCard.innerHTML = `
                        <div class="card">
                            <img src="${course.imagem_url}" class="card-img-top" alt="${course.name}">
                            <div class="card-body">
                                <h5 class="card-title">${course.name}</h5>
                                <p class="card-text">${course.description}</p>
                                <p class="card-text"><strong>Instrutor:</strong> ${course.instrutor}</p>
                                <p class="card-text"><strong>Duração:</strong> ${course.duracao} horas</p>
                                <p class="card-text"><strong>Categoria:</strong> ${course.categoria}</p>
                                <a href="curso.html?id=${course.id}" class="btn btn-primary">Ver Conteúdo</a>
                            </div>
                        </div>
                    `;
                    coursesContainer.appendChild(courseCard);
                });
            }
    
            // Adiciona a classe 'show' após um pequeno atraso
            setTimeout(() => {
                coursesContainer.classList.add('show');
            }, 100); // Altere o tempo se necessário
        } catch (error) {
            console.error('Erro ao buscar cursos:', error);
        }
    }

        // Chama a função para buscar os cursos quando a página carrega
        window.onload = fetchEnrolledCourses;


        // dashboard.js
document.addEventListener("DOMContentLoaded", function() {
    const coursesContainer = document.getElementById('courses-container');
    // Adiciona a classe fade-in ao container de cursos
    coursesContainer.classList.add('fade-in');

    // Usar setTimeout para permitir que a classe CSS seja aplicada
    setTimeout(() => {
        coursesContainer.classList.add('show');
    }, 100); // Atraso de 100ms para garantir que a animação ocorra
});
