let supabaseClient = null;

let selectedCliente = null;
let productoRowCounter = 0;
let pagoRowCounter = 0;

const ventaCatalogos = {
  estadoActivaId: null,
  origenes: {},
  metodosPago: {}
};

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
  document.getElementById('btnGuardarVenta').addEventListener('click', guardarVentaDesdeFormulario);

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
    <div
      class="item-card producto-row"
      id="${rowId}"
      data-row-id="${productoRowCounter}"
      data-producto-id=""
      data-imagen-url=""
      data-subtotal="0"
    >
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

  nombreInput.addEventListener('input', () => {
    row.dataset.productoId = '';
    row.dataset.imagenUrl = '';
    manejarBusquedaProducto(row);
  });

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
  row.dataset.imagenUrl = '';

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
      row.dataset.imagenUrl = producto.imagen_url || '';
      row.querySelector('.producto-nombre').value = producto.nombre;
      box.innerHTML = '';
      box.classList.add('hidden');

      if (producto.imagen_url) {
        mostrarPreviewExistente(row, producto.imagen_url);
      }

      recalcularFilaProducto(row);
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

  return redondear2(total);
}

function calcularTotalPagos() {
  const montos = document.querySelectorAll('.pago-monto');
  let total = 0;

  montos.forEach(input => {
    total += parseFloat(input.value || '0');
  });

  return redondear2(total);
}

/* =========================
   GUARDAR VENTA
========================= */

function redondear2(valor) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

function normalizarTexto(valor) {
  return (valor || '').trim().replace(/\s+/g, ' ');
}

function obtenerOrigenActivo() {
  const btn = document.querySelector('.origin-btn.active-origin');
  return btn ? btn.dataset.origin : '';
}

function generarCodigoFactura() {
  const ahora = new Date();
  const fecha = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0')
  ].join('');

  const hora = [
    String(ahora.getHours()).padStart(2, '0'),
    String(ahora.getMinutes()).padStart(2, '0'),
    String(ahora.getSeconds()).padStart(2, '0')
  ].join('');

  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `FAC-${fecha}-${hora}-${random}`;
}

function generarCodigoPago(index) {
  const ahora = new Date();
  const fecha = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0')
  ].join('');

  const hora = [
    String(ahora.getHours()).padStart(2, '0'),
    String(ahora.getMinutes()).padStart(2, '0'),
    String(ahora.getSeconds()).padStart(2, '0')
  ].join('');

  const sufijo = String(index + 1).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PAG-${fecha}-${hora}-${sufijo}-${random}`;
}

async function cargarCatalogosVenta() {
  if (
    ventaCatalogos.estadoActivaId &&
    ventaCatalogos.origenes.CRE &&
    ventaCatalogos.origenes.CRO &&
    ventaCatalogos.metodosPago.Efectivo
  ) {
    return;
  }

  const [
    estadosResp,
    origenesResp,
    metodosResp
  ] = await Promise.all([
    supabaseClient
      .from('estados_factura')
      .select('id, codigo')
      .eq('codigo', 'ACT')
      .single(),
    supabaseClient
      .from('origenes_factura')
      .select('id, codigo')
      .in('codigo', ['CRE', 'CRO']),
    supabaseClient
      .from('metodos_pago')
      .select('id, codigo, nombre')
      .in('codigo', ['EFE', 'TRA', 'DEP', 'OTR'])
  ]);

  if (estadosResp.error) throw estadosResp.error;
  if (origenesResp.error) throw origenesResp.error;
  if (metodosResp.error) throw metodosResp.error;

  ventaCatalogos.estadoActivaId = estadosResp.data.id;

  ventaCatalogos.origenes = {};
  (origenesResp.data || []).forEach(item => {
    ventaCatalogos.origenes[item.codigo] = item.id;
  });

  ventaCatalogos.metodosPago = {};
  (metodosResp.data || []).forEach(item => {
    ventaCatalogos.metodosPago[item.nombre] = item.id;
  });
}

function obtenerProductosFormulario() {
  const rows = [...document.querySelectorAll('.producto-row')];

  return rows.map((row, index) => {
    const nombre = normalizarTexto(row.querySelector('.producto-nombre').value);
    const cantidad = redondear2(parseFloat(row.querySelector('.producto-cantidad').value || '0'));
    const precioUnit = redondear2(parseFloat(row.querySelector('.producto-precio').value || '0'));
    const descuento = redondear2(parseFloat(row.querySelector('.producto-descuento').value || '0'));
    const subtotal = redondear2(parseFloat(row.dataset.subtotal || '0'));

    return {
      index: index + 1,
      row,
      productoId: row.dataset.productoId || '',
      imagenUrl: row.dataset.imagenUrl || '',
      nombre,
      cantidad,
      precioUnit,
      descuento,
      subtotal
    };
  });
}

function obtenerPagosFormulario() {
  const rows = [...document.querySelectorAll('.pago-row')];

  return rows.map((row, index) => {
    const fecha = row.querySelector('.pago-fecha').value;
    const monto = redondear2(parseFloat(row.querySelector('.pago-monto').value || '0'));
    const metodo = row.querySelector('.pago-metodo').value;

    return {
      index: index + 1,
      fecha,
      monto,
      metodo
    };
  });
}

function obtenerDatosVentaFormulario() {
  const clienteNombre = normalizarTexto(
    document.getElementById('clienteVenta').value
  );
  const fechaVenta = document.getElementById('fechaVenta').value;
  const origenCodigo = obtenerOrigenActivo();
  const envio = redondear2(parseFloat(document.getElementById('envioVenta').value || '0'));
  const descGlobal = redondear2(parseFloat(document.getElementById('descVenta').value || '0'));

  const productos = obtenerProductosFormulario();
  const pagos = obtenerPagosFormulario();

  const subtotalFactura = redondear2(
    productos.reduce((acc, item) => acc + item.subtotal, 0)
  );

  const totalFactura = redondear2(
    Math.max(subtotalFactura + envio - descGlobal, 0)
  );

  const pagado = redondear2(
    pagos.reduce((acc, item) => acc + item.monto, 0)
  );

  return {
    clienteNombre,
    fechaVenta,
    origenCodigo,
    envio,
    descGlobal,
    subtotalFactura,
    totalFactura,
    pagado,
    productos,
    pagos
  };
}

function validarDatosVenta(data) {
  const errores = [];

  if (!data.clienteNombre) {
    errores.push('Debes ingresar el nombre del cliente.');
  }

  if (!data.fechaVenta) {
    errores.push('Debes indicar la fecha de la venta.');
  }

  if (!data.origenCodigo) {
    errores.push('Debes seleccionar el origen.');
  }

  const productosValidos = data.productos.filter(item => item.nombre);
  if (!productosValidos.length) {
    errores.push('Debes ingresar al menos un producto.');
  }

  data.productos.forEach(item => {
    if (!item.nombre && (item.cantidad > 0 || item.precioUnit > 0 || item.descuento > 0)) {
      errores.push(`El producto ${item.index} tiene datos pero no tiene nombre.`);
    }

    if (item.nombre && item.cantidad <= 0) {
      errores.push(`La cantidad del producto ${item.index} debe ser mayor que cero.`);
    }

    if (item.nombre && item.precioUnit < 0) {
      errores.push(`El precio del producto ${item.index} no puede ser negativo.`);
    }

    if (item.nombre && item.descuento < 0) {
      errores.push(`El descuento del producto ${item.index} no puede ser negativo.`);
    }

    if (item.nombre && item.descuento > (item.cantidad * item.precioUnit)) {
      errores.push(`El descuento del producto ${item.index} no puede ser mayor que su importe.`);
    }
  });

  data.pagos.forEach(item => {
    const tieneAlgo = item.fecha || item.monto > 0 || item.metodo;
    if (!tieneAlgo) return;

    if (!item.fecha) {
      errores.push(`El pago ${item.index} debe tener fecha.`);
    }

    if (item.monto <= 0) {
      errores.push(`El pago ${item.index} debe tener un monto mayor que cero.`);
    }

    if (!item.metodo) {
      errores.push(`El pago ${item.index} debe tener método de pago.`);
    }
  });

  if (data.envio < 0) {
    errores.push('El envío no puede ser negativo.');
  }

  if (data.descGlobal < 0) {
    errores.push('El descuento global no puede ser negativo.');
  }

  if (data.totalFactura < 0) {
    errores.push('El total de la factura no es válido.');
  }

  if (data.pagado > data.totalFactura) {
    errores.push('El total pagado no puede ser mayor que el total de la factura.');
  }

  return errores;
}

async function obtenerClienteId(clienteNombre) {
  if (
    selectedCliente &&
    normalizarTexto(selectedCliente.nombre).toLowerCase() === clienteNombre.toLowerCase()
  ) {
    return selectedCliente.id;
  }

  const { data, error } = await supabaseClient
    .from('clientes')
    .select('id, nombre')
    .ilike('nombre', clienteNombre)
    .limit(1);

  if (error) throw error;

  if (data && data.length) {
    selectedCliente = data[0];
    return data[0].id;
  }

  const { data: clienteNuevo, error: errorClienteNuevo } = await supabaseClient
    .from('clientes')
    .insert([
      {
        nombre: clienteNombre,
        activo: true
      }
    ])
    .select('id, nombre')
    .single();

  if (errorClienteNuevo) throw errorClienteNuevo;

  selectedCliente = clienteNuevo;
  return clienteNuevo.id;
}

async function obtenerProductoId(itemProducto) {
  if (itemProducto.productoId) {
    return itemProducto.productoId;
  }

  const { data, error } = await supabaseClient
    .from('productos')
    .select('id, nombre, imagen_url')
    .ilike('nombre', itemProducto.nombre)
    .limit(1);

  if (error) throw error;

  if (data && data.length) {
    itemProducto.row.dataset.productoId = data[0].id;
    itemProducto.row.dataset.imagenUrl = data[0].imagen_url || '';
    return data[0].id;
  }

  const { data: productoNuevo, error: errorProductoNuevo } = await supabaseClient
    .from('productos')
    .insert([
      {
        nombre: itemProducto.nombre,
        categoria_producto_id: null,
        imagen_url: null,
        activo: true
      }
    ])
    .select('id')
    .single();

  if (errorProductoNuevo) throw errorProductoNuevo;

  itemProducto.row.dataset.productoId = productoNuevo.id;
  itemProducto.row.dataset.imagenUrl = '';
  return productoNuevo.id;
}

function obtenerMetodoPagoId(nombreMetodo) {
  return ventaCatalogos.metodosPago[nombreMetodo] || null;
}

async function insertarFactura(data, clienteId) {
  const origenFacturaId = ventaCatalogos.origenes[data.origenCodigo];
  const estadoFacturaId = ventaCatalogos.estadoActivaId;

  if (!origenFacturaId) {
    throw new Error(`No se encontró el origen ${data.origenCodigo}.`);
  }

  if (!estadoFacturaId) {
    throw new Error('No se encontró el estado ACT de factura.');
  }

  let facturaCodigo = generarCodigoFactura();

  for (let intento = 0; intento < 3; intento += 1) {
    const { data: factura, error } = await supabaseClient
      .from('facturas')
      .insert([
        {
          factura_codigo: facturaCodigo,
          fecha: data.fechaVenta,
          cliente_id: clienteId,
          subtotal_factura: data.subtotalFactura,
          envio: data.envio,
          desc_global: data.descGlobal,
          total_factura: data.totalFactura,
          pagado: data.pagado,
          estado_factura_id: estadoFacturaId,
          origen_factura_id: origenFacturaId,
          observaciones: null
        }
      ])
      .select('id, factura_codigo')
      .single();

    if (!error) {
      return factura;
    }

    const esDuplicado = String(error.message || '').toLowerCase().includes('duplicate')
      || String(error.details || '').toLowerCase().includes('already exists')
      || error.code === '23505';

    if (!esDuplicado) {
      throw error;
    }

    facturaCodigo = generarCodigoFactura();
  }

  throw new Error('No fue posible generar un código único para la factura.');
}

async function insertarDetalleFactura(facturaId, productos) {
  const detalles = [];

  for (const item of productos) {
    if (!item.nombre) continue;

    const productoId = await obtenerProductoId(item);

    detalles.push({
      factura_id: facturaId,
      producto_id: productoId,
      cantidad: item.cantidad,
      precio_unit: item.precioUnit,
      desc_prod: item.descuento,
      subtotal: item.subtotal,
      imagen_producto: item.imagenUrl || null
    });
  }

  if (!detalles.length) {
    return;
  }

  const { error } = await supabaseClient
    .from('detalle_factura')
    .insert(detalles);

  if (error) throw error;
}

async function insertarPagosFactura(facturaId, clienteId, pagos) {
  const pagosValidos = pagos.filter(item => item.fecha && item.monto > 0 && item.metodo);

  if (!pagosValidos.length) {
    return;
  }

  const payload = pagosValidos.map((item, index) => {
    const metodoPagoId = obtenerMetodoPagoId(item.metodo);

    if (!metodoPagoId) {
      throw new Error(`No se encontró el método de pago "${item.metodo}".`);
    }

    return {
      pago_codigo: generarCodigoPago(index),
      factura_id: facturaId,
      cliente_id: clienteId,
      tipo_pago_id: null,
      metodo_pago_id: metodoPagoId,
      fecha: item.fecha,
      monto: item.monto,
      nota: null,
      activo: true
    };
  });

  const { error } = await supabaseClient
    .from('pagos_factura')
    .insert(payload);

  if (error) throw error;
}

function setEstadoBotonGuardar(guardando) {
  const btn = document.getElementById('btnGuardarVenta');
  if (!btn) return;

  btn.disabled = guardando;
  btn.textContent = guardando ? 'Guardando...' : 'Guardar venta';
}

async function guardarVentaDesdeFormulario() {
  try {
    setEstadoBotonGuardar(true);

    await cargarCatalogosVenta();

    const data = obtenerDatosVentaFormulario();
    const errores = validarDatosVenta(data);

    if (errores.length) {
      alert(errores.join('\n'));
      return;
    }

    const clienteId = await obtenerClienteId(data.clienteNombre);
    const factura = await insertarFactura(data, clienteId);

    await insertarDetalleFactura(factura.id, data.productos);
    await insertarPagosFactura(factura.id, clienteId, data.pagos);

    alert(`Venta guardada correctamente.\nCódigo: ${factura.factura_codigo}`);
    limpiarFormularioVenta();
  } catch (error) {
    console.error('Error guardando venta:', error);
    alert(error.message || 'Ocurrió un error al guardar la venta.');
  } finally {
    setEstadoBotonGuardar(false);
  }
}

/* =========================
   UTILIDADES
========================= */

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