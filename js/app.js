let supabaseClient = null;

let selectedCliente = null;
let productoRowCounter = 0;
let pagoRowCounter = 0;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('OligarApp v2 iniciada');

  supabaseClient = window.supabase.createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseKey
  );

  document.getElementById('btnLogin').addEventListener('click', login);
  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('btnMenuToggle').addEventListener('click', toggleMobileMenu);
  document.getElementById('btnAddProducto').addEventListener('click', () => {
    agregarFilaProducto();
  });
  document.getElementById('btnAddPago').addEventListener('click', () => {
    agregarFilaPago();
  });
  document.getElementById('btnLimpiarVenta').addEventListener('click', limpiarFormularioVenta);

  document.getElementById('envioVenta').addEventListener('input', recalcularResumen);
  document.getElementById('descVenta').addEventListener('input', recalcularResumen);
  document.getElementById('clienteVenta').addEventListener('input', manejarBusquedaCliente);

  configurarMenuMovil();
  configurarOrigenVenta();
  actualizarSeccionActiva('Inicio');

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

function inicializarFormularioVenta() {
  const fechaVenta = document.getElementById('fechaVenta');
  if (fechaVenta && !fechaVenta.value) {
    fechaVenta.value = obtenerFechaHoy();
  }

  if (!document.querySelector('.producto-row')) {
    agregarFilaProducto();
  }

  if (!document.querySelector('.pago-row')) {
    agregarFilaPago();
  }

  recalcularResumen();
}

function limpiarFormularioVenta() {
  selectedCliente = null;

  document.getElementById('clienteVenta').value = '';
  document.getElementById('clienteSuggestions').innerHTML = '';
  document.getElementById('clienteSuggestions').classList.add('hidden');

  document.getElementById('fechaVenta').value = obtenerFechaHoy();
  document.getElementById('envioVenta').value = '0';
  document.getElementById('descVenta').value = '0';

  document.querySelectorAll('.origin-btn').forEach(btn => {
    btn.classList.remove('active-origin');
    if (btn.dataset.origin === 'CRE') {
      btn.classList.add('active-origin');
    }
  });

  document.getElementById('productosContainer').innerHTML = '';
  document.getElementById('pagosContainer').innerHTML = '';

  productoRowCounter = 0;
  pagoRowCounter = 0;

  agregarFilaProducto();
  agregarFilaPago();
  recalcularResumen();
}

function obtenerFechaHoy() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function configurarMenuMovil() {
  const mobileButtons = document.querySelectorAll('.mobile-menu-btn[data-view]');

  mobileButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;
      const sectionName = btn.textContent.trim();

      document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active-section');
      });

      document.getElementById(targetView).classList.add('active-section');
      actualizarSeccionActiva(sectionName);
      cerrarMenuMovil();

      // 👇 SOLO cuando entras a ventas
      if (targetView === 'ventaView') {
        if (!document.querySelector('.producto-row')) {
          inicializarFormularioVenta();
        }
      }
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

function actualizarSeccionActiva(nombre) {
  const label = document.getElementById('activeSectionLabel');
  if (label) {
    label.textContent = nombre;
  }
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('hidden');
}

function cerrarMenuMovil() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.add('hidden');
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

  const nombreUsuario = user.email ? user.email.split('@')[0] : 'Usuario';
  document.getElementById('userEmail').textContent = nombreUsuario;
}

function mostrarLogin() {
  document.getElementById('appView').classList.remove('active');
  document.getElementById('appView').classList.add('hidden');

  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('loginView').classList.add('active');

  document.getElementById('userEmail').textContent = '';
  document.getElementById('password').value = '';
  cerrarMenuMovil();
}

/* =========================
   CLIENTES
========================= */

let clienteSearchTimeout = null;

function manejarBusquedaCliente() {
  selectedCliente = null;

  const input = document.getElementById('clienteVenta');
  const term = input.value.trim();

  if (clienteSearchTimeout) {
    clearTimeout(clienteSearchTimeout);
  }

  if (term.length < 2) {
    renderClienteSuggestions([]);
    return;
  }

  clienteSearchTimeout = setTimeout(async () => {
    const resultados = await buscarClientes(term);
    renderClienteSuggestions(resultados);
  }, 250);
}

async function buscarClientes(term) {
  try {
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('id, cliente_codigo, nombre')
      .ilike('nombre', `%${term}%`)
      .limit(8);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error buscando clientes:', err.message);
    return [];
  }
}

function renderClienteSuggestions(clientes) {
  const box = document.getElementById('clienteSuggestions');

  if (!clientes.length) {
    box.innerHTML = '';
    box.classList.add('hidden');
    return;
  }

  box.innerHTML = clientes.map(cliente => `
    <div class="suggestion-item" data-cliente-id="${cliente.id}">
      <div class="suggestion-title">${escapeHtml(cliente.nombre)}</div>
      <div class="suggestion-subtitle">${escapeHtml(cliente.cliente_codigo || 'Sin código')}</div>
    </div>
  `).join('');

  box.classList.remove('hidden');

  box.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const cliente = clientes.find(c => c.id === item.dataset.clienteId);
      if (!cliente) return;

      selectedCliente = cliente;
      document.getElementById('clienteVenta').value = cliente.nombre;
      box.innerHTML = '';
      box.classList.add('hidden');
    });
  });
}

/* =========================
   PRODUCTOS
========================= */

function agregarFilaProducto() {
  productoRowCounter += 1;

  const container = document.getElementById('productosContainer');
  const rowId = `productoRow-${productoRowCounter}`;

  const html = `
    <div class="item-card producto-row" id="${rowId}" data-row-id="${productoRowCounter}">
      <h4 class="item-card-title">Producto ${productoRowCounter}</h4>

      <div class="item-grid">
        <div class="field-group-inline autocomplete-wrapper">
          <label>Nombre</label>
          <input
            type="text"
            class="producto-nombre"
            placeholder="Escribe el nombre del producto"
            autocomplete="off"
          >
          <div class="suggestions hidden"></div>
        </div>

        <div class="field-group-inline">
          <label>Cant.</label>
          <input type="number" class="producto-cantidad" value="1" min="1" step="1">
        </div>

        <div class="field-group-inline">
          <label>Precio</label>
          <input type="number" class="producto-precio" value="0" min="0" step="0.01">
        </div>

        <div class="field-group-inline">
          <label>Desc. C$</label>
          <input type="number" class="producto-descuento" value="0" min="0" step="0.01">
        </div>

        <button type="button" class="btn-remove">×</button>
      </div>

      <div class="item-grid">
        <div class="field-group-inline">
          <label>Imagen</label>
          <input type="file" class="producto-imagen-file" accept="image/*">
        </div>

        <div class="field-group-inline">
          <label>Subtotal</label>
          <input type="text" class="producto-subtotal" value="C$ 0.00" readonly>
        </div>
      </div>

      <div class="product-preview hidden">
        <img src="" alt="Vista previa del producto" class="producto-preview-img">
        <div class="product-preview-text">Imagen del producto seleccionada</div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);

  const row = document.getElementById(rowId);
  configurarFilaProducto(row);
  renumerarProductos();
  recalcularResumen();
}

function configurarFilaProducto(row) {
  const btnRemove = row.querySelector('.btn-remove');
  const nombreInput = row.querySelector('.producto-nombre');
  const cantidadInput = row.querySelector('.producto-cantidad');
  const precioInput = row.querySelector('.producto-precio');
  const descuentoInput = row.querySelector('.producto-descuento');
  const fileInput = row.querySelector('.producto-imagen-file');

  btnRemove.addEventListener('click', () => {
    row.remove();
    renumerarProductos();
    recalcularResumen();
  });

  nombreInput.addEventListener('input', () => manejarBusquedaProducto(row));
  cantidadInput.addEventListener('input', () => recalcularFilaProducto(row));
  precioInput.addEventListener('input', () => recalcularFilaProducto(row));
  descuentoInput.addEventListener('input', () => recalcularFilaProducto(row));
  fileInput.addEventListener('change', () => manejarPreviewImagen(row));

  recalcularFilaProducto(row);
}

function renumerarProductos() {
  const rows = document.querySelectorAll('.producto-row');
  rows.forEach((row, index) => {
    const title = row.querySelector('.item-card-title');
    if (title) {
      title.textContent = `Producto ${index + 1}`;
    }
  });
}

async function manejarBusquedaProducto(row) {
  const input = row.querySelector('.producto-nombre');
  const box = row.querySelector('.suggestions');
  const term = input.value.trim();

  row.dataset.productoId = '';

  if (term.length < 2) {
    box.innerHTML = '';
    box.classList.add('hidden');
    return;
  }

  const resultados = await buscarProductos(term);
  renderProductoSuggestions(row, resultados);
}

async function buscarProductos(term) {
  try {
    const { data, error } = await supabaseClient
      .from('productos')
      .select('id, producto_codigo, nombre, imagen_url')
      .ilike('nombre', `%${term}%`)
      .limit(8);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error buscando productos:', err.message);
    return [];
  }
}

function renderProductoSuggestions(row, productos) {
  const box = row.querySelector('.suggestions');

  if (!productos.length) {
    box.innerHTML = '';
    box.classList.add('hidden');
    return;
  }

  box.innerHTML = productos.map(producto => `
    <div class="suggestion-item" data-producto-id="${producto.id}">
      <div class="suggestion-title">${escapeHtml(producto.nombre)}</div>
      <div class="suggestion-subtitle">${escapeHtml(producto.producto_codigo || 'Sin código')}</div>
    </div>
  `).join('');

  box.classList.remove('hidden');

  box.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const producto = productos.find(p => p.id === item.dataset.productoId);
      if (!producto) return;

      row.dataset.productoId = producto.id;
      row.querySelector('.producto-nombre').value = producto.nombre;
      box.innerHTML = '';
      box.classList.add('hidden');

      if (producto.imagen_url) {
        mostrarPreviewExistente(row, producto.imagen_url);
      }
    });
  });
}

function manejarPreviewImagen(row) {
  const input = row.querySelector('.producto-imagen-file');
  const file = input.files?.[0];

  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    mostrarPreviewExistente(row, e.target.result);
  };
  reader.readAsDataURL(file);
}

function mostrarPreviewExistente(row, src) {
  const preview = row.querySelector('.product-preview');
  const img = row.querySelector('.producto-preview-img');

  img.src = src;
  preview.classList.remove('hidden');
}

function recalcularFilaProducto(row) {
  const cantidad = parseFloat(row.querySelector('.producto-cantidad').value || '0');
  const precio = parseFloat(row.querySelector('.producto-precio').value || '0');
  const descuento = parseFloat(row.querySelector('.producto-descuento').value || '0');

  const subtotal = Math.max((cantidad * precio) - descuento, 0);

  row.querySelector('.producto-subtotal').value = formatearMoneda(subtotal);
  row.dataset.subtotal = subtotal.toString();

  recalcularResumen();
}

/* =========================
   PAGOS
========================= */

function agregarFilaPago() {
  pagoRowCounter += 1;

  const container = document.getElementById('pagosContainer');
  const rowId = `pagoRow-${pagoRowCounter}`;

  const html = `
    <div class="item-card pago-row" id="${rowId}">
      <h4 class="item-card-title">Pago ${pagoRowCounter}</h4>

      <div class="item-grid-pagos">
        <div class="field-group-inline">
          <label>Fecha</label>
          <input type="date" class="pago-fecha" value="${obtenerFechaHoy()}">
        </div>

        <div class="field-group-inline">
          <label>Monto</label>
          <input type="number" class="pago-monto" value="0" min="0" step="0.01">
        </div>

        <div class="field-group-inline">
          <label>Método</label>
          <select class="pago-metodo">
            <option value="">Selecciona</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Depósito">Depósito</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <button type="button" class="btn-remove">×</button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);

  const row = document.getElementById(rowId);
  configurarFilaPago(row);
  renumerarPagos();
  recalcularResumen();
}

function configurarFilaPago(row) {
  const btnRemove = row.querySelector('.btn-remove');
  const montoInput = row.querySelector('.pago-monto');

  btnRemove.addEventListener('click', () => {
    row.remove();
    renumerarPagos();
    recalcularResumen();
  });

  montoInput.addEventListener('input', recalcularResumen);
}

function renumerarPagos() {
  const rows = document.querySelectorAll('.pago-row');
  rows.forEach((row, index) => {
    const title = row.querySelector('.item-card-title');
    if (title) {
      title.textContent = `Pago ${index + 1}`;
    }
  });
}

/* =========================
   RESUMEN
========================= */

function recalcularResumen() {
  const subtotal = calcularSubtotalProductos();
  const envio = parseFloat(document.getElementById('envioVenta').value || '0');
  const descGlobal = parseFloat(document.getElementById('descVenta').value || '0');
  const total = Math.max(subtotal + envio - descGlobal, 0);
  const pagado = calcularTotalPagos();
  const saldo = Math.max(total - pagado, 0);

  document.getElementById('subtotalResumen').textContent = formatearMoneda(subtotal);
  document.getElementById('totalResumen').textContent = formatearMoneda(total);
  document.getElementById('pagadoResumen').textContent = formatearMoneda(pagado);
  document.getElementById('saldoResumen').textContent = formatearMoneda(saldo);
}

function calcularSubtotalProductos() {
  const rows = document.querySelectorAll('.producto-row');
  let total = 0;

  rows.forEach(row => {
    total += parseFloat(row.dataset.subtotal || '0');
  });

  return total;
}

function calcularTotalPagos() {
  const montos = document.querySelectorAll('.pago-monto');
  let total = 0;

  montos.forEach(input => {
    total += parseFloat(input.value || '0');
  });

  return total;
}

function formatearMoneda(valor) {
  return `C$ ${Number(valor || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}