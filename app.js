// ============================================================
// CAMADA DE DADOS (localStorage simulando banco)
// ============================================================
const DB = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem('gs_' + key)) || [];
    } catch {
      return [];
    }
  },
  set(key, data) {
    localStorage.setItem('gs_' + key, JSON.stringify(data));
  },
  getNextId(key) {
    const items = this.get(key);
    return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
  }
};

// Inicializa dados de exemplo (se vazio)
function initData() {
  if (DB.get('usuarios').length === 0) {
    DB.set('usuarios', [{
      id: 1,
      nome: 'Administrador',
      email: 'admin@admin.com',
      senhaHash: hashPassword('admin123')
    }]);
  }
  if (DB.get('turmas').length === 0) {
    DB.set('turmas', [
      { id: 1, nome: 'Turma A', descricao: 'Manhã' },
      { id: 2, nome: 'Turma B', descricao: 'Tarde' }
    ]);
  }
  if (DB.get('alunos').length === 0) {
    DB.set('alunos', [
      { id: 1, nome: 'Ana Silva', idade: 15, email: 'ana@email.com', turma_id: 1 },
      { id: 2, nome: 'Bruno Costa', idade: 16, email: 'bruno@email.com', turma_id: 1 },
      { id: 3, nome: 'Carla Souza', idade: 14, email: 'carla@email.com', turma_id: 2 }
    ]);
  }
}

// ============================================================
// AUTENTICAÇÃO (simulada, com hash simples)
// ============================================================
function hashPassword(pwd) {
  let hash = 0;
  for (let i = 0; i < pwd.length; i++) {
    const chr = pwd.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'h' + Math.abs(hash).toString(16);
}

let currentUser = null;
let token = localStorage.getItem('gs_token');

function register(nome, email, senha) {
  const usuarios = DB.get('usuarios');
  if (usuarios.some(u => u.email === email)) {
    throw new Error('Email já cadastrado.');
  }
  if (!nome || !email || !senha) {
    throw new Error('Preencha todos os campos.');
  }
  if (senha.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres.');
  }
  const novo = {
    id: DB.getNextId('usuarios'),
    nome,
    email,
    senhaHash: hashPassword(senha)
  };
  usuarios.push(novo);
  DB.set('usuarios', usuarios);
  return novo;
}

function login(email, senha) {
  const usuarios = DB.get('usuarios');
  const user = usuarios.find(u => u.email === email);
  if (!user) throw new Error('Credenciais inválidas.');
  if (user.senhaHash !== hashPassword(senha)) {
    throw new Error('Credenciais inválidas.');
  }
  token = 'token_' + user.id + '_' + Date.now();
  localStorage.setItem('gs_token', token);
  currentUser = user;
  return user;
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('gs_token');
  updateUI();
}

function getCurrentUser() {
  if (!token) return null;
  const id = parseInt(token.split('_')[1]);
  const usuarios = DB.get('usuarios');
  return usuarios.find(u => u.id === id) || null;
}

// ============================================================
// NAVEGAÇÃO E UI
// ============================================================
const navLinks = document.getElementById('nav-links');
const userInfoDiv = document.getElementById('user-info');
const authSection = document.getElementById('auth-section');
const studentsSection = document.getElementById('students-section');
const classesSection = document.getElementById('classes-section');
const gradesSection = document.getElementById('grades-section');
const attendanceSection = document.getElementById('attendance-section');
const feedbackMsg = document.getElementById('feedback-message');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');

function showFeedback(message, type = 'success') {
  feedbackMsg.textContent = message;
  feedbackMsg.className = `feedback ${type}`;
  feedbackMsg.classList.remove('hidden');
  clearTimeout(feedbackMsg._timeout);
  feedbackMsg._timeout = setTimeout(() => {
    feedbackMsg.classList.add('hidden');
  }, 3000);
}

function updateUI() {
  const user = getCurrentUser();
  if (user) {
    currentUser = user;
    renderNavbar(true);
    showSection('students');
  } else {
    currentUser = null;
    renderNavbar(false);
    showSection('auth');
  }
}

function renderNavbar(authenticated) {
  navLinks.innerHTML = '';
  if (authenticated) {
    navLinks.innerHTML = `
      <li><button data-section="students">Alunos</button></li>
      <li><button data-section="classes">Turmas</button></li>
      <li><button data-section="grades">Notas</button></li>
      <li><button data-section="attendance">Frequência</button></li>
    `;
    userInfoDiv.innerHTML = `
      <span>Olá, ${currentUser.nome}</span>
      <button id="logout-btn" class="btn-danger">Sair</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', logout);
  } else {
    navLinks.innerHTML = '';
    userInfoDiv.innerHTML = '';
  }
  navLinks.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      showSection(btn.dataset.section);
      navLinks.classList.remove('show');
    });
  });
}

function showSection(section) {
  [authSection, studentsSection, classesSection, gradesSection, attendanceSection]
    .forEach(s => s.classList.add('hidden'));

  switch (section) {
    case 'auth':
      authSection.classList.remove('hidden');
      break;
    case 'students':
      studentsSection.classList.remove('hidden');
      loadStudents();
      loadClassesForSelect('student-turma');
      break;
    case 'classes':
      classesSection.classList.remove('hidden');
      loadClasses();
      break;
    case 'grades':
      gradesSection.classList.remove('hidden');
      loadClassesForSelect('grade-turma-select');
      break;
    case 'attendance':
      attendanceSection.classList.remove('hidden');
      loadClassesForSelect('att-turma-select');
      break;
  }
}

// Menu mobile
mobileMenuBtn.addEventListener('click', () => {
  navLinks.classList.toggle('show');
});

// ============================================================
// AUTENTICAÇÃO — EVENTOS
// ============================================================
document.getElementById('show-login').addEventListener('click', () => {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('show-login').classList.add('active');
  document.getElementById('show-register').classList.remove('active');
});

document.getElementById('show-register').addEventListener('click', () => {
  document.getElementById('register-form').classList.remove('hidden');
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('show-register').classList.add('active');
  document.getElementById('show-login').classList.remove('active');
});

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  try {
    login(email, senha);
    document.getElementById('login-error').textContent = '';
    updateUI();
    showFeedback('Login realizado com sucesso!');
  } catch (err) {
    document.getElementById('login-error').textContent = err.message;
  }
});

document.getElementById('register-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('reg-nome').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const senha = document.getElementById('reg-senha').value;
  try {
    register(nome, email, senha);
    login(email, senha);
    document.getElementById('register-error').textContent = '';
    updateUI();
    showFeedback('Registro realizado com sucesso!');
  } catch (err) {
    document.getElementById('register-error').textContent = err.message;
  }
});

// ============================================================
// ALUNOS — CRUD
// ============================================================
function loadStudents() {
  const alunos = DB.get('alunos');
  const turmas = DB.get('turmas');
  const tbody = document.querySelector('#students-table tbody');
  tbody.innerHTML = '';
  alunos.forEach(a => {
    const turma = turmas.find(t => t.id === a.turma_id);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${a.nome}</td>
      <td>${a.idade}</td>
      <td>${a.email}</td>
      <td>${turma ? turma.nome : 'Sem turma'}</td>
      <td>
        <button class="btn-secondary" onclick="editStudent(${a.id})">Editar</button>
        <button class="btn-danger" onclick="deleteStudent(${a.id})">Remover</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

document.getElementById('student-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('student-id').value;
  const nome = document.getElementById('student-nome').value.trim();
  const idade = parseInt(document.getElementById('student-idade').value);
  const email = document.getElementById('student-email').value.trim();
  const turma_id = document.getElementById('student-turma').value
    ? parseInt(document.getElementById('student-turma').value)
    : null;

  if (!nome || !email) {
    showFeedback('Preencha nome e email.', 'error');
    return;
  }
  if (!idade || idade < 1) {
    showFeedback('Idade inválida.', 'error');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFeedback('Email inválido.', 'error');
    return;
  }

  let alunos = DB.get('alunos');

  if (alunos.some(a => a.email === email && a.id !== parseInt(id))) {
    showFeedback('Email já cadastrado para outro aluno.', 'error');
    return;
  }

  if (id) {
    const aluno = alunos.find(a => a.id === parseInt(id));
    if (!aluno) return;
    aluno.nome = nome;
    aluno.idade = idade;
    aluno.email = email;
    aluno.turma_id = turma_id;
    DB.set('alunos', alunos);
    showFeedback('Aluno atualizado com sucesso!');
  } else {
    const novo = {
      id: DB.getNextId('alunos'),
      nome,
      idade,
      email,
      turma_id
    };
    alunos.push(novo);
    DB.set('alunos', alunos);
    showFeedback('Aluno cadastrado com sucesso!');
  }
  resetStudentForm();
  loadStudents();
});

function resetStudentForm() {
  document.getElementById('student-id').value = '';
  document.getElementById('student-nome').value = '';
  document.getElementById('student-idade').value = '';
  document.getElementById('student-email').value = '';
  document.getElementById('student-turma').value = '';
  document.getElementById('student-submit-btn').textContent = 'Cadastrar';
  document.getElementById('student-cancel-btn').classList.add('hidden');
  document.getElementById('student-form-title').textContent = 'Cadastrar Aluno';
}

document.getElementById('student-cancel-btn').addEventListener('click', resetStudentForm);

function editStudent(id) {
  const aluno = DB.get('alunos').find(a => a.id === id);
  if (!aluno) return;
  document.getElementById('student-id').value = aluno.id;
  document.getElementById('student-nome').value = aluno.nome;
  document.getElementById('student-idade').value = aluno.idade;
  document.getElementById('student-email').value = aluno.email;
  document.getElementById('student-turma').value = aluno.turma_id || '';
  document.getElementById('student-submit-btn').textContent = 'Atualizar';
  document.getElementById('student-cancel-btn').classList.remove('hidden');
  document.getElementById('student-form-title').textContent = 'Editar Aluno';
  document.querySelector('#students-section .form-card').scrollIntoView({ behavior: 'smooth' });
}

function deleteStudent(id) {
  const aluno = DB.get('alunos').find(a => a.id === id);
  if (!aluno) return;
  if (!confirm(`Tem certeza que deseja remover o aluno "${aluno.nome}"?`)) return;

  let alunos = DB.get('alunos').filter(a => a.id !== id);
  DB.set('alunos', alunos);
  let notas = DB.get('notas').filter(n => n.aluno_id !== id);
  DB.set('notas', notas);
  let presencas = DB.get('presencas').filter(p => p.aluno_id !== id);
  DB.set('presencas', presencas);

  showFeedback('Aluno removido com sucesso!');
  loadStudents();
}

// ============================================================
// TURMAS — CRUD
// ============================================================
function loadClasses() {
  const turmas = DB.get('turmas');
  const tbody = document.querySelector('#classes-table tbody');
  tbody.innerHTML = '';
  turmas.forEach(t => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.nome}</td>
      <td>${t.descricao || ''}</td>
      <td>
        <button class="btn-secondary" onclick="editClass(${t.id})">Editar</button>
        <button class="btn-danger" onclick="deleteClass(${t.id})">Remover</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

document.getElementById('class-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('class-id').value;
  const nome = document.getElementById('class-nome').value.trim();
  const descricao = document.getElementById('class-descricao').value.trim();

  if (!nome) {
    showFeedback('Informe o nome da turma.', 'error');
    return;
  }

  let turmas = DB.get('turmas');

  if (id) {
    const turma = turmas.find(t => t.id === parseInt(id));
    if (!turma) return;
    turma.nome = nome;
    turma.descricao = descricao;
    DB.set('turmas', turmas);
    showFeedback('Turma atualizada com sucesso!');
  } else {
    const nova = {
      id: DB.getNextId('turmas'),
      nome,
      descricao
    };
    turmas.push(nova);
    DB.set('turmas', turmas);
    showFeedback('Turma criada com sucesso!');
  }
  resetClassForm();
  loadClasses();
});

function resetClassForm() {
  document.getElementById('class-id').value = '';
  document.getElementById('class-nome').value = '';
  document.getElementById('class-descricao').value = '';
  document.getElementById('class-submit-btn').textContent = 'Cadastrar';
  document.getElementById('class-cancel-btn').classList.add('hidden');
  document.getElementById('class-form-title').textContent = 'Cadastrar Turma';
}

document.getElementById('class-cancel-btn').addEventListener('click', resetClassForm);

function editClass(id) {
  const turma = DB.get('turmas').find(t => t.id === id);
  if (!turma) return;
  document.getElementById('class-id').value = turma.id;
  document.getElementById('class-nome').value = turma.nome;
  document.getElementById('class-descricao').value = turma.descricao || '';
  document.getElementById('class-submit-btn').textContent = 'Atualizar';
  document.getElementById('class-cancel-btn').classList.remove('hidden');
  document.getElementById('class-form-title').textContent = 'Editar Turma';
  document.querySelector('#classes-section .form-card').scrollIntoView({ behavior: 'smooth' });
}

function deleteClass(id) {
  const turma = DB.get('turmas').find(t => t.id === id);
  if (!turma) return;
  if (!confirm(`Tem certeza que deseja remover a turma "${turma.nome}"?`)) return;

  let turmas = DB.get('turmas').filter(t => t.id !== id);
  DB.set('turmas', turmas);

  let alunos = DB.get('alunos').map(a => {
    if (a.turma_id === id) a.turma_id = null;
    return a;
  });
  DB.set('alunos', alunos);

  let notas = DB.get('notas').filter(n => n.turma_id !== id);
  DB.set('notas', notas);

  showFeedback('Turma removida com sucesso!');
  loadClasses();
}

// ============================================================
// AUXILIAR: CARREGAR TURMAS EM SELECTS
// ============================================================
function loadClassesForSelect(selectId) {
  const select = document.getElementById(selectId);
  const turmas = DB.get('turmas');
  const currentValue = select.value;
  select.innerHTML = '<option value="">-- Selecione --</option>';
  turmas.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.nome;
    select.appendChild(opt);
  });
  if (currentValue && turmas.some(t => t.id === parseInt(currentValue))) {
    select.value = currentValue;
  }
}

// ============================================================
// NOTAS
// ============================================================
document.getElementById('grade-turma-select').addEventListener('change', loadGrades);

function loadGrades() {
  const turma_id = parseInt(document.getElementById('grade-turma-select').value);
  if (!turma_id) {
    document.querySelector('#grades-table tbody').innerHTML = '';
    return;
  }
  const alunos = DB.get('alunos').filter(a => a.turma_id === turma_id);
  const notas = DB.get('notas').filter(n => n.turma_id === turma_id);
  const tbody = document.querySelector('#grades-table tbody');
  tbody.innerHTML = '';

  if (alunos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light);">Nenhum aluno nesta turma.</td></tr>';
    return;
  }

  alunos.forEach(aluno => {
    const notaObj = notas.find(n => n.aluno_id === aluno.id);
    const notaValor = notaObj ? notaObj.nota : '';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${aluno.nome}</td>
      <td>${aluno.email}</td>
      <td>
        <input type="number" min="0" max="10" step="0.1"
               id="nota-input-${aluno.id}" value="${notaValor}"
               style="width:90px;">
      </td>
      <td>
        <button class="btn-success" onclick="saveGrade(${aluno.id}, ${turma_id})">Salvar</button>
        ${notaObj ? `<button class="btn-danger" onclick="deleteGrade(${aluno.id}, ${turma_id})">Remover</button>` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}

function saveGrade(aluno_id, turma_id) {
  const input = document.getElementById(`nota-input-${aluno_id}`);
  const valor = parseFloat(input.value);
  if (isNaN(valor) || valor < 0 || valor > 10) {
    showFeedback('Nota inválida. Deve ser entre 0 e 10.', 'error');
    return;
  }

  let notas = DB.get('notas');
  const existente = notas.find(n => n.aluno_id === aluno_id && n.turma_id === turma_id);
  if (existente) {
    existente.nota = valor;
  } else {
    notas.push({
      id: DB.getNextId('notas'),
      aluno_id,
      turma_id,
      nota: valor
    });
  }
  DB.set('notas', notas);
  showFeedback('Nota salva com sucesso!');
  loadGrades();
}

function deleteGrade(aluno_id, turma_id) {
  if (!confirm('Remover a nota deste aluno?')) return;
  let notas = DB.get('notas').filter(n => !(n.aluno_id === aluno_id && n.turma_id === turma_id));
  DB.set('notas', notas);
  showFeedback('Nota removida com sucesso!');
  loadGrades();
}

// ============================================================
// FREQUÊNCIA
// ============================================================
document.getElementById('att-load-btn').addEventListener('click', loadAttendance);
document.getElementById('att-save-btn').addEventListener('click', saveAttendance);

function loadAttendance() {
  const turma_id = parseInt(document.getElementById('att-turma-select').value);
  const data = document.getElementById('att-data').value;
  if (!turma_id || !data) {
    showFeedback('Selecione a turma e a data.', 'error');
    return;
  }

  const alunos = DB.get('alunos').filter(a => a.turma_id === turma_id);
  const presencas = DB.get('presencas');
  const tbody = document.querySelector('#attendance-table tbody');
  tbody.innerHTML = '';

  if (alunos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-light);">Nenhum aluno nesta turma.</td></tr>';
    return;
  }

  alunos.forEach(aluno => {
    const registro = presencas.find(p => p.aluno_id === aluno.id && p.data === data);
    const presente = registro ? registro.presente : true;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${aluno.nome}</td>
      <td>${aluno.email}</td>
      <td>
        <input type="checkbox" id="att-check-${aluno.id}" ${presente ? 'checked' : ''}
               style="width:20px;height:20px;cursor:pointer;">
      </td>
    `;
    tbody.appendChild(row);
  });
}

function saveAttendance() {
  const turma_id = parseInt(document.getElementById('att-turma-select').value);
  const data = document.getElementById('att-data').value;
  if (!turma_id || !data) {
    showFeedback('Carregue a frequência primeiro.', 'error');
    return;
  }

  const alunos = DB.get('alunos').filter(a => a.turma_id === turma_id);
  if (alunos.length === 0) {
    showFeedback('Nenhum aluno para salvar.', 'error');
    return;
  }

  let presencas = DB.get('presencas');

  alunos.forEach(aluno => {
    const checkbox = document.getElementById(`att-check-${aluno.id}`);
    if (!checkbox) return;
    const presente = checkbox.checked;

    const existente = presencas.find(p => p.aluno_id === aluno.id && p.data === data);
    if (existente) {
      existente.presente = presente;
    } else {
      presencas.push({
        id: DB.getNextId('presencas'),
        aluno_id: aluno.id,
        data,
        presente
      });
    }
  });

  DB.set('presencas', presencas);
  showFeedback('Frequência salva com sucesso!');
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
initData();
updateUI();

// Expor funções usadas em onclick (escopo global)
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.editClass = editClass;
window.deleteClass = deleteClass;
window.saveGrade = saveGrade;
window.deleteGrade = deleteGrade;
window.showSection = showSection;
window.logout = logout;