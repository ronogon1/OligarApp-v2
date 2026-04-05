let supabase = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('OligarApp v2 iniciada');

  supabase = window.supabase.createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseKey
  );

  console.log('Cliente Supabase listo');

  await probarConexion();
});

async function probarConexion() {
  try {
    const { data, error } = await supabase
      .from('estados_factura')
      .select('codigo, nombre')
      .limit(5);

    if (error) throw error;

    console.log('Conexión OK. Datos de prueba:', data);
  } catch (err) {
    console.error('Error de conexión con Supabase:', err.message);
  }
}