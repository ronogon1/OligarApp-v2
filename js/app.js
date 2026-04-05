let supabaseClient = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('OligarApp v2 iniciada');

  supabaseClient = window.supabase.createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseKey
  );

  document.getElementById('btnLogin').addEventListener('click', login);
  document.getElementById('btnLogout').addEventListener('click', logout);

  async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');

    errorEl.textContent = '';

    const { data, error } = await supabase.auth.signInWithPassword({
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
    await supabase.auth.signOut();
    mostrarLogin();
  }

  function mostrarApp(user) {
    document.getElementById('loginView').classList.remove('active');
    document.getElementById('appView').classList.add('active');

    document.getElementById('userEmail').textContent = user.email;
  }

  function mostrarLogin() {
    document.getElementById('appView').classList.remove('active');
    document.getElementById('loginView').classList.add('active');
  }
});

async function probarConexion() {
  try {
    const { data, error } = await supabaseClient
      .from('estados_factura')
      .select('codigo, nombre')
      .limit(5);

    if (error) throw error;

    console.log('Conexión OK. Datos de prueba:', data);
  } catch (err) {
    console.error('Error de conexión con Supabase:', err.message);
  }
}