let supabaseClient = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('OligarApp v2 iniciada');

  supabaseClient = window.supabase.createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseKey
  );

  document.getElementById('btnLogin').addEventListener('click', login);
  document.getElementById('btnLogout').addEventListener('click', logout);

  configurarNavegacion();
  configurarOrigenVenta();

  console.log('Cliente Supabase listo');

  await verificarSesionActual();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      mostrarApp(session.user);
    } else {
      mostrarLogin();
    }
  });
});

function configurarNavegacion() {
  const navButtons = document.querySelectorAll('.nav-btn');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;

      document.querySelectorAll('.nav-btn').forEach(item => {
        item.classList.remove('active');
      });

      document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active-section');
      });

      btn.classList.add('active');
      document.getElementById(targetView).classList.add('active-section');
    });
  });
}

function configurarOrigenVenta() {
  const originButtons = document.querySelectorAll('.origin-btn');

  originButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      originButtons.forEach(item => item.classList.remove('active-origin'));
      btn.classList.add('active-origin');
    });
  });
}

async function verificarSesionActual() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error('Error verificando sesión:', error.message);
    mostrarLogin();
    return;
  }

  if (data.session?.user) {
    mostrarApp(data.session.user);
  } else {
    mostrarLogin();
  }
}

async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');

  errorEl.textContent = '';

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    errorEl.textContent = error.message;
    return;
  }

  mostrarApp(data.user);
}

async function logout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error('Error al cerrar sesión:', error.message);
    return;
  }

  mostrarLogin();
}

function mostrarApp(user) {
  document.getElementById('loginView').classList.remove('active');
  document.getElementById('loginView').classList.add('hidden');

  document.getElementById('appView').classList.remove('hidden');
  document.getElementById('appView').classList.add('active');

  document.getElementById('userEmail').textContent = user.email;
}

function mostrarLogin() {
  document.getElementById('appView').classList.remove('active');
  document.getElementById('appView').classList.add('hidden');

  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('loginView').classList.add('active');

  document.getElementById('userEmail').textContent = '';
  document.getElementById('password').value = '';
}