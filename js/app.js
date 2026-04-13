let supabaseClient = null;

let selectedCliente = null;
let productoRowCounter = 0;
let pagoRowCounter = 0;

const ventaCatalogos = {
  estadoSaldoPendienteId: null,
  estadoCanceladaId: null,
  origenes: {},
  metodosPago: {}
};

const STORAGE_BUCKET_PRODUCTOS = 'productos';
const MAX_IMAGE_SIZE_BYTES = 1024 * 1024; // 1 MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]

document.addEventListener('DOMContentLoaded', async () => {
  console.log('OligarApp v2 iniciada');

  supabaseClient = window.supabase.createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseKey
  );

  document.getElementById('btnLogin').addEventListener('click', login);
  document.getElementById('btnLogout').addEventListener('click', manejarBotonPrincipalTopbar);
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

  document.getElementById('btnBuscarFacturas').addEventListener('click', buscarFacturas);

  document.getElementById('btnBuscarClientes').addEventListener('click', buscarClientesGestion);
  document.getElementById('btnGuardarCliente').addEventListener('click', guardarClienteGestion);
  document.getElementById('btnLimpiarCliente').addEventListener('click', limpiarFormularioCliente);

  document.getElementById('btnBuscarProductos').addEventListener('click', buscarProductosGestion);
  document.getElementById('btnGuardarProducto').addEventListener('click', guardarProductoGestion);
  document.getElementById('btnLimpiarProducto').addEventListener('click', limpiarFormularioProducto);
  document.getElementById('productoImagenForm').addEventListener('change', manejarPreviewImagenProductoGestion);
  document.getElementById('btnQuitarImagenProductoForm').addEventListener('click', quitarImagenProductoGestion);

  document.getElementById('btnSeleccionarImagenProducto').addEventListener('click', () => {
    document.getElementById('productoImagenForm').click();
  });

  document.getElementById('btnGuardarCostosFactura')
    ?.addEventListener('click', guardarCostosFacturaActual);
  document.getElementById('btnCerrarCostosFactura')
    ?.addEventListener('click', cerrarPanelCostosFactura);
  
  document.getElementById('btnGuardarEnvioFactura')
    ?.addEventListener('click', guardarEnvioFacturaActual);
  document.getElementById('btnCerrarEnvioFactura')
    ?.addEventListener('click', cerrarPanelEnvioFactura);

  document.getElementById('btnAddProductoEdicion')
    .addEventListener('click', () => {
      agregarFilaProductoEdicion();
    });
  document.getElementById('btnAddPagoEdicion')
    .addEventListener('click', () => {
      agregarFilaPagoEdicion();
    });

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('envioEdicionFactura')
      ?.addEventListener('input', recalcularResumenEdicionFactura);
    document.getElementById('descEdicionFactura')
      ?.addEventListener('input', recalcularResumenEdicionFactura);
  });

  document.getElementById('btnCerrarEdicionFactura')
    ?.addEventListener('click', cerrarPanelEdicionFactura);
  document.getElementById('btnGuardarCambiosFactura')
    ?.addEventListener('click', guardarCambiosFactura);
  
  document.getElementById('btnNuevoCliente')
    ?.addEventListener('click', () => {
      limpiarFormularioCliente();
      mostrarFormularioCliente();
    });
  document.getElementById('btnNuevoProducto')
    ?.addEventListener('click', () => {
      limpiarFormularioProducto();
      mostrarFormularioProducto();
    });

  document.getElementById('reporteTipo')
      ?.addEventListener('change', manejarCambioTipoReporte);

  document.getElementById('btnBuscarReporte')
      ?.addEventListener('click', buscarReporte);

  document.getElementById('btnLimpiarReporte')
      ?.addEventListener('click', limpiarFiltrosReporte);
  
  document.getElementById('filtroReporteMes')
    ?.addEventListener('change', sincronizarFechasReporteDesdeMes);

  document.getElementById('btnBuscarFlujos')
    ?.addEventListener('click', buscarFlujos);

  document.getElementById('btnGuardarFlujo')
    ?.addEventListener('click', guardarMovimientoFlujo);

  document.getElementById('btnLimpiarFlujo')
    ?.addEventListener('click', limpiarFormularioFlujo);

  document.getElementById('filtroFlujoMes')
  ?.addEventListener('change', sincronizarFechasFlujoDesdeMes);

  document.getElementById('btnToggleFormularioFlujo')
    ?.addEventListener('click', toggleFormularioFlujo);

  document.getElementById('btnCancelarEdicionFlujo')
    ?.addEventListener('click', cancelarEdicionFlujo);

  configurarMenuMovil();
  configurarOrigenVenta();
  manejarCambioTipoReporte();
  inicializarFiltrosReporte();
  inicializarVistaFlujos();
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
    btn.addEventListener('click', async () => {
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

      if (targetView === 'flujosView') {
        inicializarVistaFlujos();
        await buscarFlujos();
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

  actualizarBotonPrincipalTopbar();
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

function irAInicio() {
  document.querySelectorAll('.app-section').forEach(section => {
    section.classList.remove('active-section');
  });

  document.getElementById('homeView').classList.add('active-section');
  actualizarSeccionActiva('Inicio');
  cerrarMenuMovil();
}

async function manejarBotonPrincipalTopbar() {
  const homeActiva = document
    .getElementById('homeView')
    ?.classList.contains('active-section');

  if (homeActiva) {
    await logout();
  } else {
    irAInicio();
  }
}

function mostrarApp(user) {
  document.getElementById('loginView').classList.remove('active');
  document.getElementById('loginView').classList.add('hidden');

  document.getElementById('appView').classList.remove('hidden');
  document.getElementById('appView').classList.add('active');

  const nombreUsuario = user.email ? user.email.split('@')[0] : 'Usuario';
  document.getElementById('userEmail').textContent = nombreUsuario;

  document.querySelectorAll('.app-section').forEach(section => {
    section.classList.remove('active-section');
  });

  document.getElementById('homeView').classList.add('active-section');
  actualizarSeccionActiva('Inicio');
}

function mostrarLogin() {
  document.getElementById('appView').classList.remove('active');
  document.getElementById('appView').classList.add('hidden');

  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('loginView').classList.add('active');

  document.getElementById('userEmail').textContent = '';
  document.getElementById('password').value = '';
  cerrarMenuMovil();

  const btn = document.getElementById('btnLogout');
  if (btn) {
    btn.textContent = 'Salir';
  }
}

/* CLIENTES
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
      .eq('activo', true)
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

async function generarCodigoCliente() {
  const prefijo = 'CLI-';
  const regex = /^CLI-(\d{6})$/;

  const siguiente = await obtenerSiguienteConsecutivo({
    tabla: 'clientes',
    columna: 'cliente_codigo',
    prefijo,
    regex
  });

  return formatearCodigo(prefijo, siguiente, 6);
}

async function crearClienteNuevo(clienteNombre) {
  for (let intento = 0; intento < 8; intento += 1) {
    const clienteCodigo = await generarCodigoCliente();

    const { data, error } = await supabaseClient
      .from('clientes')
      .insert([
        {
          cliente_codigo: clienteCodigo,
          nombre: clienteNombre,
          activo: true
        }
      ])
      .select('id, nombre, cliente_codigo')
      .single();

    if (!error) {
      selectedCliente = data;
      return data;
    }

    if (!esErrorDuplicado(error)) {
      throw error;
    }
  }

  throw new Error('No fue posible generar un código único para el cliente.');
}

/* PRODUCTOS
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
      data-producto-codigo=""
      data-imagen-url=""
      data-imagen-local=""
      data-imagen-delete="0"
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

          <div class="file-upload-wrapper">
            <input
              type="file"
              class="producto-imagen-file file-input-hidden"
              accept="image/jpeg,image/jpg,image/png,image/webp"
            >

            <button type="button" class="btn-secondary btn-seleccionar-imagen">
              📷 Seleccionar imagen
            </button>

            <span class="file-name nombre-archivo-producto">
              No se ha seleccionado imagen
            </span>
          </div>

          <button type="button" class="btn-remove-image hidden">
            Quitar imagen
          </button>
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
  const btnRemoveImage = row.querySelector('.btn-remove-image');
  const btnSeleccionarImagen = row.querySelector('.btn-seleccionar-imagen');

  const nombreInput = row.querySelector('.producto-nombre');
  const cantidadInput = row.querySelector('.producto-cantidad');
  const precioInput = row.querySelector('.producto-precio');
  const descuentoInput = row.querySelector('.producto-descuento');

  const fileInput = row.querySelector('.producto-imagen-file');

  // Eliminar fila
  btnRemove.addEventListener('click', () => {
    row.remove();
    renumerarProductos();
    recalcularResumen();
  });

  // Botón personalizado para abrir selector de imagen
  if (btnSeleccionarImagen && fileInput) {
    btnSeleccionarImagen.addEventListener('click', () => {
      fileInput.click();
    });
  }

  // Autocompletado producto
  nombreInput.addEventListener('input', () => {
    limpiarProductoSeleccionado(row);
    manejarBusquedaProducto(row);
  });

  // Cálculos
  cantidadInput.addEventListener('input', () => recalcularFilaProducto(row));
  precioInput.addEventListener('input', () => recalcularFilaProducto(row));
  descuentoInput.addEventListener('input', () => recalcularFilaProducto(row));

  // Advertencia antes de cambiar imagen existente
  fileInput.addEventListener('click', event => {
    advertirCambioImagenProducto(row, event);
  });

  // Preview imagen
  fileInput.addEventListener('change', () => manejarPreviewImagen(row));

  // Quitar imagen
  if (btnRemoveImage) {
    btnRemoveImage.addEventListener('click', () => {
      manejarEliminarImagenProducto(row);
    });
  }

  // Inicialización
  recalcularFilaProducto(row);
  actualizarEstadoVisualImagen(row);
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
      .eq('activo', true)
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
      row.dataset.productoCodigo = producto.producto_codigo || '';
      row.dataset.imagenUrl = producto.imagen_url || '';
      row.dataset.imagenLocal = '';
      row.dataset.imagenDelete = '0';

      row.querySelector('.producto-nombre').value = producto.nombre;

      const fileInput = row.querySelector('.producto-imagen-file');
      if (fileInput) {
        fileInput.value = '';
      }

      box.innerHTML = '';
      box.classList.add('hidden');

      if (producto.imagen_url) {
        mostrarPreviewExistente(row, producto.imagen_url);
      } else {
        limpiarPreviewImagenProducto(row);
      }

      recalcularFilaProducto(row);
    });
  });
}

function manejarPreviewImagen(row) {
  const file = obtenerArchivoImagenFila(row);

  if (!file) {
    row.dataset.imagenLocal = '';
    actualizarEstadoVisualImagen(row);
    return;
  }

  const validacion = validarArchivoImagen(file);

  if (!validacion.ok) {
    alert(validacion.mensaje);

    row.dataset.imagenLocal = '';
    row.dataset.imagenDelete = '0';

    limpiarInputImagenProducto(row);

    if (row.dataset.imagenUrl) {
      mostrarPreviewExistente(row, row.dataset.imagenUrl);
    } else {
      limpiarPreviewImagenProducto(row);
    }

    return;
  }

  row.dataset.imagenDelete = '0';

  const reader = new FileReader();
  reader.onload = e => {
    const imageSrc = e.target?.result || '';
    row.dataset.imagenLocal = imageSrc;
    mostrarPreviewExistente(row, imageSrc);
  };
  reader.readAsDataURL(file);
}

function mostrarPreviewExistente(row, src) {
  const preview = row.querySelector('.product-preview');
  const img = row.querySelector('.producto-preview-img');

  img.src = src;
  preview.classList.remove('hidden');

  actualizarEstadoVisualImagen(row);
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

async function generarCodigoProducto(origenCodigo) {
  if (!['CRE', 'CRO'].includes(origenCodigo)) {
    throw new Error(`Origen de producto no válido: ${origenCodigo}`);
  }

  const prefijo = `${origenCodigo}-`;
  const regex = new RegExp(`^${origenCodigo}-(\\d{6})$`);

  const siguiente = await obtenerSiguienteConsecutivo({
    tabla: 'productos',
    columna: 'producto_codigo',
    prefijo,
    regex
  });

  return formatearCodigo(prefijo, siguiente, 6);
}

async function crearProductoNuevo(itemProducto, origenCodigo) {
  for (let intento = 0; intento < 8; intento += 1) {
    const productoCodigo = await generarCodigoProducto(origenCodigo);

    const { data, error } = await supabaseClient
      .from('productos')
      .insert([
        {
          producto_codigo: productoCodigo,
          nombre: itemProducto.nombre,
          imagen_url: null,
          activo: true
        }
      ])
      .select('id, producto_codigo, imagen_url')
      .single();

    if (!error) {
      itemProducto.row.dataset.productoId = data.id;
      itemProducto.row.dataset.productoCodigo = data.producto_codigo || '';
      itemProducto.row.dataset.imagenUrl = data.imagen_url || '';
      return data;
    }

    if (!esErrorDuplicado(error)) {
      throw error;
    }
  }

  throw new Error(`No fue posible generar un código único para el producto "${itemProducto.nombre}".`);
}

function limpiarProductoSeleccionado(row) {
  row.dataset.productoId = '';
  row.dataset.productoCodigo = '';
  row.dataset.imagenUrl = '';
  row.dataset.imagenLocal = '';
  row.dataset.imagenDelete = '0';

  const fileInput = row.querySelector('.producto-imagen-file');
  if (fileInput) {
    fileInput.value = '';
  }

  limpiarPreviewImagenProducto(row);
}

function limpiarPreviewImagenProducto(row) {
  const preview = row.querySelector('.product-preview');
  const img = row.querySelector('.producto-preview-img');
  const nombreSpan = row.querySelector('.nombre-archivo-producto');
  const fileInput = row.querySelector('.producto-imagen-file');

  if (img) {
    img.src = '';
  }

  if (preview) {
    preview.classList.add('hidden');
  }

  if (fileInput) {
    fileInput.value = '';
  }

  if (nombreSpan) {
    nombreSpan.textContent = 'No se ha seleccionado imagen';
  }

  actualizarEstadoVisualImagen(row);
}

function actualizarEstadoVisualImagen(row) {
  const btnRemoveImage = row.querySelector('.btn-remove-image');
  if (!btnRemoveImage) return;

  const tieneImagen = Boolean(row.dataset.imagenUrl || row.dataset.imagenLocal);
  const marcadaParaEliminar = row.dataset.imagenDelete === '1';

  if (tieneImagen && !marcadaParaEliminar) {
    btnRemoveImage.classList.remove('hidden');
  } else {
    btnRemoveImage.classList.add('hidden');
  }
}

function advertirCambioImagenProducto(row, event) {
  const tieneImagenPersistida = Boolean(row.dataset.imagenUrl);
  const tieneProductoExistente = Boolean(row.dataset.productoId);

  if (!tieneProductoExistente || !tieneImagenPersistida) {
    return;
  }

  const ok = confirm(
    'Este producto ya tiene una imagen. La nueva imagen sustituirá la imagen anterior al guardar la venta. ¿Deseas continuar?'
  );

  if (!ok) {
    event.preventDefault();
  }
}

function manejarEliminarImagenProducto(row) {
  const fileInput = row.querySelector('.producto-imagen-file');
  const tieneImagenPersistida = Boolean(row.dataset.imagenUrl);
  const tieneImagenLocal = Boolean(row.dataset.imagenLocal);

  if (!tieneImagenPersistida && !tieneImagenLocal) {
    return;
  }

  const mensaje = tieneImagenPersistida
    ? 'La imagen de este producto se borrará de la base de datos y del Storage al guardar la venta. ¿Deseas continuar?'
    : 'La imagen seleccionada se quitará de esta venta. ¿Deseas continuar?';

  const ok = confirm(mensaje);
  if (!ok) return;

  row.dataset.imagenDelete = '1';
  row.dataset.imagenLocal = '';

  if (fileInput) {
    fileInput.value = '';
  }

  limpiarPreviewImagenProducto(row);
}

function obtenerArchivoImagenFila(row) {
  return row.querySelector('.producto-imagen-file')?.files?.[0] || null;
}

function obtenerExtensionArchivo(file) {
  const mime = file?.type || '';

  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';

  const nombre = file?.name || '';
  const partes = nombre.split('.');
  const extensionNombre = partes.length > 1 ? partes.pop().toLowerCase() : '';

  if (['jpg', 'jpeg'].includes(extensionNombre)) return 'jpg';
  if (extensionNombre === 'png') return 'png';
  if (extensionNombre === 'webp') return 'webp';

  return 'jpg';
}

function construirRutaImagenProducto(productoCodigo, file) {
  const extension = obtenerExtensionArchivo(file);
  return `${productoCodigo}/${productoCodigo}.${extension}`;
}

function obtenerStoragePathDesdePublicUrl(url) {
  if (!url) return '';

  try {
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET_PRODUCTOS}/`;
    const parsed = new URL(url);

    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return '';

    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch (_error) {
    return '';
  }
}

async function subirImagenProductoStorage(file, path) {
  const validacion = validarArchivoImagen(file);

  if (!validacion.ok) {
    throw new Error(validacion.mensaje);
  }

  const { error } = await supabaseClient
    .storage
    .from(STORAGE_BUCKET_PRODUCTOS)
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || undefined
    });

  if (error) {
    throw error;
  }

  const { data } = supabaseClient
    .storage
    .from(STORAGE_BUCKET_PRODUCTOS)
    .getPublicUrl(path);

  return data.publicUrl;
}

async function eliminarImagenStorage(url) {
  const path = obtenerStoragePathDesdePublicUrl(url);
  if (!path) return;

  const { error } = await supabaseClient
    .storage
    .from(STORAGE_BUCKET_PRODUCTOS)
    .remove([path]);

  if (error) {
    throw error;
  }
}

async function actualizarImagenProductoBD(productoId, imagenUrl) {
  const { error } = await supabaseClient
    .from('productos')
    .update({
      imagen_url: imagenUrl
    })
    .eq('id', productoId);

  if (error) {
    throw error;
  }
}

async function sincronizarImagenProducto(itemProducto, producto) {
  const row = itemProducto.row;
  const file = obtenerArchivoImagenFila(row);
  const eliminarImagen = row.dataset.imagenDelete === '1';
  const imagenActual = producto.imagen_url || row.dataset.imagenUrl || '';

  if (eliminarImagen) {
    if (imagenActual) {
      await eliminarImagenStorage(imagenActual);
      await actualizarImagenProductoBD(producto.id, null);
    }

    row.dataset.imagenUrl = '';
    row.dataset.imagenLocal = '';
    row.dataset.imagenDelete = '0';

    itemProducto.imagenUrl = '';
    itemProducto.imagenLocal = '';

    limpiarPreviewImagenProducto(row);
    return null;
  }

  if (!file) {
    itemProducto.imagenUrl = imagenActual;
    return imagenActual || null;
  }

  const nuevaRuta = construirRutaImagenProducto(producto.producto_codigo, file);
  const rutaAnterior = obtenerStoragePathDesdePublicUrl(imagenActual);

  const nuevaUrl = await subirImagenProductoStorage(file, nuevaRuta);

  await actualizarImagenProductoBD(producto.id, nuevaUrl);

  if (rutaAnterior && rutaAnterior !== nuevaRuta) {
    await eliminarImagenStorage(imagenActual);
  }

  row.dataset.imagenUrl = nuevaUrl;
  row.dataset.imagenLocal = '';
  row.dataset.imagenDelete = '0';

  itemProducto.imagenUrl = nuevaUrl;
  itemProducto.imagenLocal = '';

  mostrarPreviewExistente(row, nuevaUrl);

  return nuevaUrl;
}


/* PAGOS
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
            <option value="Otro">Otro</option>
          </select>
        </div>

        <button type="button" class="btn-remove">×</button>
      </div>

      <div class="item-grid">
        <div class="field-group-inline">
          <label>Nota</label>
          <input
            type="text"
            class="pago-nota"
            placeholder="Referencia, banco, comprobante u observación"
            maxlength="200"
          >
        </div>
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

async function obtenerBaseSiguientePago() {
  const prefijo = 'PAG-';
  const regex = /^PAG-(\d{6})$/;

  return await obtenerSiguienteConsecutivo({
    tabla: 'pagos_factura',
    columna: 'pago_codigo',
    prefijo,
    regex
  });
}

function generarCodigoPagoDesdeBase(base, index) {
  return formatearCodigo('PAG-', base + index, 6);
}


/* RESUMEN
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


/* GUARDAR VENTA
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

async function generarCodigoFactura() {
  const year = new Date().getFullYear();
  const prefijo = `FAC-${year}`;
  const regex = new RegExp(`^FAC-${year}(\\d{4})$`);

  const siguiente = await obtenerSiguienteConsecutivo({
    tabla: 'facturas',
    columna: 'factura_codigo',
    prefijo,
    regex
  });

  return formatearCodigo(prefijo, siguiente, 4);
}

/*
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
*/

async function cargarCatalogosVenta() {
  if (
    ventaCatalogos.estadoSaldoPendienteId &&
    ventaCatalogos.estadoCanceladaId &&
    ventaCatalogos.origenes.CRE &&
    ventaCatalogos.origenes.CRO &&
    ventaCatalogos.metodosPago.Efectivo &&
    ventaCatalogos.metodosPago.Transferencia &&
    ventaCatalogos.metodosPago.Otro
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
      .in('codigo', ['CSP', 'CAN']),
    supabaseClient
      .from('origenes_factura')
      .select('id, codigo')
      .in('codigo', ['CRE', 'CRO']),
    supabaseClient
      .from('metodos_pago')
      .select('id, codigo, nombre')
      .in('codigo', ['EFE', 'TRA', 'OTR'])
  ]);

  if (estadosResp.error) throw estadosResp.error;
  if (origenesResp.error) throw origenesResp.error;
  if (metodosResp.error) throw metodosResp.error;

  ventaCatalogos.estadoSaldoPendienteId = null;
  ventaCatalogos.estadoCanceladaId = null;

  (estadosResp.data || []).forEach(e => {
    if (e.codigo === 'CSP') {
      ventaCatalogos.estadoSaldoPendienteId = e.id;
    }

    if (e.codigo === 'CAN') {
      ventaCatalogos.estadoCanceladaId = e.id;
    }
  });

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
      productoCodigo: row.dataset.productoCodigo || '',
      imagenUrl: row.dataset.imagenUrl || '',
      imagenLocal: row.dataset.imagenLocal || '',
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
    const nota = normalizarTexto(row.querySelector('.pago-nota')?.value || '');

    return {
      index: index + 1,
      fecha,
      monto,
      metodo,
      nota
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

  const saldoPendiente = redondear2(
    Math.max(totalFactura - pagado, 0)
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
    saldoPendiente,
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
    .select('id, nombre, cliente_codigo')
    .ilike('nombre', clienteNombre)
    .limit(1);

  if (error) {
    throw error;
  }

  if (data && data.length) {
    selectedCliente = data[0];
    return data[0].id;
  }

  const clienteNuevo = await crearClienteNuevo(clienteNombre);
  return clienteNuevo.id;
}

async function obtenerProductoId(itemProducto, origenCodigo) {
  if (itemProducto.productoId) {
    const { data, error } = await supabaseClient
      .from('productos')
      .select('id, nombre, producto_codigo, imagen_url')
      .eq('id', itemProducto.productoId)
      .single();

    if (error) {
      throw error;
    }

    itemProducto.row.dataset.productoCodigo = data.producto_codigo || '';
    itemProducto.row.dataset.imagenUrl = data.imagen_url || '';

    return data;
  }

  const { data, error } = await supabaseClient
    .from('productos')
    .select('id, nombre, producto_codigo, imagen_url')
    .ilike('nombre', itemProducto.nombre)
    .limit(1);

  if (error) {
    throw error;
  }

  if (data && data.length) {
    itemProducto.row.dataset.productoId = data[0].id;
    itemProducto.row.dataset.productoCodigo = data[0].producto_codigo || '';
    itemProducto.row.dataset.imagenUrl = data[0].imagen_url || '';
    return data[0];
  }

  return await crearProductoNuevo(itemProducto, origenCodigo);
}

function obtenerMetodoPagoId(nombreMetodo) {
  return ventaCatalogos.metodosPago[nombreMetodo] || null;
}

async function insertarFactura(data, clienteId) {
  const origenFacturaId = ventaCatalogos.origenes[data.origenCodigo];

  if (!origenFacturaId) {
    throw new Error(`No se encontró el origen ${data.origenCodigo}.`);
  }

  // 🔹 Calcular total pagado a partir de los pagos
  const totalPagado = (data.pagos || []).reduce((acc, pago) => {
    return acc + Number(pago.monto || 0);
  }, 0);

  // 🔹 Calcular saldo pendiente
  const totalFactura = Number(data.totalFactura || 0);
  const saldoPendiente = totalFactura - totalPagado;

  // 🔹 Determinar estado correcto (CSP o CAN)
  let estadoFacturaId = ventaCatalogos.estadoSaldoPendienteId;

  if (saldoPendiente <= 0) {
    estadoFacturaId = ventaCatalogos.estadoCanceladaId;
  }

  if (!estadoFacturaId) {
    throw new Error('No se encontró el estado CSP/CAN de factura.');
  }

  for (let intento = 0; intento < 8; intento += 1) {
    const facturaCodigo = await generarCodigoFactura();

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
          total_factura: totalFactura,
          pagado: totalPagado, // 🔥 usamos el valor calculado
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

    if (!esErrorDuplicado(error)) {
      throw error;
    }
  }

  throw new Error('No fue posible generar un código único para la factura.');
}

async function insertarDetalleFactura(facturaId, productos, origenCodigo) {
  const detalles = [];

  for (const item of productos) {
    if (!item.nombre) continue;

    const producto = await obtenerProductoId(item, origenCodigo);
    const imagenProducto = await sincronizarImagenProducto(item, producto);

    detalles.push({
      factura_id: facturaId,
      producto_id: producto.id,
      cantidad: item.cantidad,
      precio_unit: item.precioUnit,
      desc_prod: item.descuento,
      subtotal: item.subtotal,
      imagen_producto: imagenProducto || null
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

  for (let intento = 0; intento < 8; intento += 1) {
    const basePago = await obtenerBaseSiguientePago();

    const payload = pagosValidos.map((item, index) => {
      const metodoPagoId = obtenerMetodoPagoId(item.metodo);

      if (!metodoPagoId) {
        throw new Error(`No se encontró el método de pago "${item.metodo}".`);
      }

      return {
        pago_codigo: generarCodigoPagoDesdeBase(basePago, index),
        factura_id: facturaId,
        cliente_id: clienteId,
        metodo_pago_id: metodoPagoId,
        fecha: item.fecha,
        monto: item.monto,
        nota: item.nota || null,
        activo: true
      };
    });

    const { error } = await supabaseClient
      .from('pagos_factura')
      .insert(payload);

    if (!error) {
      return;
    }

    if (!esErrorDuplicado(error)) {
      throw error;
    }
  }

  throw new Error('No fue posible generar códigos únicos para los pagos.');
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

    await insertarDetalleFactura(
      factura.id, 
      data.productos,
      data.origenCodigo
    );

    await insertarPagosFactura(factura.id, clienteId, data.pagos);

    mostrarFactura(data, factura, data.clienteNombre);
    limpiarFormularioVenta();
  } catch (error) {
    console.error('Error guardando venta:', error);
    alert(error.message || 'Ocurrió un error al guardar la venta.');
  } finally {
    setEstadoBotonGuardar(false);
  }
}


/* GESTIÓN FACTURAS
========================= */

let facturaEdicionActual = null;
let selectedClienteEdicion = null;

function mostrarFactura(data, factura, clienteNombre) {
  const modal = document.getElementById('facturaModal');

  const subtotalFactura = Number(data.subtotalFactura || 0);
  const envio = Number(data.envio || 0);
  const descGlobal = Number(data.descGlobal || 0);
  const totalFactura = Number(data.totalFactura || 0);
  const pagado = Number(data.pagado || 0);
  const saldoPendiente = Number(data.saldoPendiente || 0);

  const tituloEl = document.getElementById('facturaTitulo');
  const logoEl = document.getElementById('facturaLogo');
  const infoEl = document.querySelector('.factura-info');

  if (data.origenCodigo === 'CRO') {
    logoEl.src = 'assets/logos/logo_oligar_crochet.png';
    logoEl.style.width = '150px';
    logoEl.style.maxHeight = '140px';
    tituloEl.textContent = 'Oligar Crochet';
    infoEl.innerHTML = `
      Managua, Nicaragua | Celular: 7841 1119<br>
      oligar.crochet@gmail.com
    `;
  } else {
    logoEl.src = 'assets/logos/logo_oligar_creaciones.png';
    logoEl.style.width = '190px';
    logoEl.style.maxHeight = '140px';
    tituloEl.textContent = 'Oligar Creaciones';
    infoEl.innerHTML = `
      Managua, Nicaragua | Celular: 7841 1119<br>
      oligar.creaciones@gmail.com
    `;
  }

  document.getElementById('facturaCodigo').textContent =
    `Factura N°: ${factura.factura_codigo}`;

  document.getElementById('facturaFecha').textContent =
    `Fecha: ${formatearFechaFactura(data.fechaVenta)}`;

  document.getElementById('facturaCliente').innerHTML =
    `<strong>Cliente:</strong> ${escapeHtml(clienteNombre)}`;

  const body = document.getElementById('facturaProductosBody');
  body.innerHTML = '';

  data.productos
    .filter(p => p.nombre)
    .forEach(p => {
      const cantidad = Number(p.cantidad || 0);
      const precioUnit = Number(p.precioUnit || 0);
      const descuento = Number(p.descuento || 0);
      const subtotal = Number(p.subtotal || 0);

      const div = document.createElement('div');
      div.className = 'factura-item';

      div.innerHTML = `
        <div>
          <div>${cantidad}x ${escapeHtml(p.nombre)}</div>
          <div class="factura-item-desc">
            Precio unitario: C$ ${formatearMontoFactura(precioUnit)}
            ${descuento > 0
              ? ` | <span class="descuento">Desc: C$ ${formatearMontoFactura(descuento)}</span>`
              : ''}
          </div>
        </div>
        <div>C$ ${formatearMontoFactura(subtotal)}</div>
      `;

      body.appendChild(div);
    });

  const totales = document.getElementById('facturaTotales');
  totales.innerHTML = `
    <div class="factura-total-row">
      <span>Subtotal:</span>
      <span>C$ ${formatearMontoFactura(subtotalFactura)}</span>
    </div>
    <div class="factura-total-row">
      <span>Envío:</span>
      <span>C$ ${formatearMontoFactura(envio)}</span>
    </div>
    ${descGlobal > 0 ? `
      <div class="factura-total-row">
        <span>Descuento global:</span>
        <span>C$ ${formatearMontoFactura(descGlobal)}</span>
      </div>
    ` : ''}
    <div class="factura-total-row total-general">
      <span>Total:</span>
      <span>C$ ${formatearMontoFactura(totalFactura)}</span>
    </div>
  `;

  const pagos = document.getElementById('facturaPagos');
  if (saldoPendiente <= 0) {
    pagos.innerHTML = `
      <div class="factura-pagado">Pagado: C$ ${formatearMontoFactura(pagado)}</div>
      <div class="cancelado">CANCELADO</div>
    `;
  } else {
    pagos.innerHTML = `
      <div>
        <span class="factura-pagado">Pagado: C$ ${formatearMontoFactura(pagado)}</span>
        &nbsp; | &nbsp;
        <span class="factura-saldo">Saldo pendiente: C$ ${formatearMontoFactura(saldoPendiente)}</span>
      </div>
    `;
  }

  const imgContainer = document.getElementById('facturaImagenes');
  imgContainer.innerHTML = '';

  data.productos
    .filter(p => p.nombre && (p.imagenLocal || p.imagenUrl))
    .forEach(p => {
      const srcImagen = p.imagenLocal || p.imagenUrl;

      const div = document.createElement('div');
      div.className = 'factura-img-card';

      div.innerHTML = `
        <img src="${srcImagen}" alt="${escapeHtml(p.nombre)}">
        <span>${escapeHtml(p.nombre)}</span>
      `;

      imgContainer.appendChild(div);
    });

  modal.classList.remove('hidden');
}

function cerrarFactura() {
  document.getElementById('facturaModal').classList.add('hidden');
}


/* CONSULTA DE FACTURAS
==================== */

async function buscarFacturas() {
  try {
    const codigo = normalizarTexto(
      document.getElementById('filtroFacturaCodigo').value
    );

    const cliente = normalizarTexto(
      document.getElementById('filtroFacturaCliente').value
    );

    const fechaDesde = document.getElementById('filtroFacturaFechaDesde').value;
    const fechaHasta = document.getElementById('filtroFacturaFechaHasta').value;
    const origen = document.getElementById('filtroFacturaOrigen').value;
    const estado = document.getElementById('filtroFacturaEstado').value;

    let query = supabaseClient
      .from('vw_facturas_resumen')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);

    if (codigo) {
      query = query.ilike('factura_codigo', `%${codigo}%`);
    }

    if (cliente) {
      query = query.ilike('cliente_nombre', `%${cliente}%`);
    }

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta);
    }

    if (origen) {
      query = query.eq('origen_codigo', origen);
    }

    if (estado) {
      query = query.eq('estado_codigo', estado);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    renderTablaFacturas(data || []);
  } catch (error) {
    console.error('Error buscando facturas:', error);
    alert(error.message || 'Ocurrió un error al buscar facturas.');
  }
}

function renderTablaFacturas(facturas) {
  const table = document.getElementById('tablaFacturas');
  const body = document.getElementById('tablaFacturasBody');
  const empty = document.getElementById('facturasEmptyState');

  body.innerHTML = '';

  if (!facturas.length) {
    table.classList.add('hidden');
    empty.textContent = 'No se encontraron facturas con esos filtros.';
    return;
  }

  empty.textContent = '';
  table.classList.remove('hidden');

  facturas.forEach(item => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(item.factura_codigo || '')}</td>
      <td>${escapeHtml(formatearFechaFactura(item.fecha || ''))}</td>
      <td>${escapeHtml(item.cliente_nombre || '')}</td>
      <td>${escapeHtml(item.origen_nombre || '')}</td>
      <td>C$ ${formatearMontoFactura(item.total_factura || 0)}</td>
      <td>C$ ${formatearMontoFactura(item.pagado || 0)}</td>
      <td>C$ ${formatearMontoFactura(item.saldo_pendiente || 0)}</td>
      
      <td class="${getClaseEstado(item.estado_codigo)}">
        ${escapeHtml(item.estado_nombre || '')}
      </td>

      <td>
        ${renderBotonEstadoFactura(item)}
      </td>
      <td class="status-icon-cell">
        ${renderIndicadorCostos(item.estado_costos)}
      </td>
      <td class="status-icon-cell">
        ${renderIndicadorEnvio(item.envio_registrado)}
      </td>
      <td>
        <div class="table-actions-wrap">
        
          <button
            type="button"
            class="table-action-btn btn-ver-factura"
            data-factura-id="${item.id}"
          >
            Reimprimir
          </button>

          <button
            type="button"
            class="table-action-btn btn-costos-factura"
            data-factura-id="${item.id}"
          >
            Costos MO/MD
          </button>

          <button
            type="button"
            class="table-action-btn btn-envio-factura"
            data-factura-id="${item.id}"
          >
            Costo Envío
          </button>

          <button
            type="button"
            class="table-action-btn btn-editar-factura"
            data-factura-id="${item.id}"
          >
            ✏️ Editar
          </button>

        </div>
      </td>
    `;

    body.appendChild(tr);
  });

  body.querySelectorAll('.btn-ver-factura').forEach(btn => {
    btn.addEventListener('click', () => {
      abrirFacturaGuardada(btn.dataset.facturaId);
    });
  });

  body.querySelectorAll('.btn-editar-factura').forEach(btn => {
    btn.addEventListener('click', () => {
      abrirPanelEdicionFactura(btn.dataset.facturaId);
    });
  });

  body.querySelectorAll('.btn-costos-factura').forEach(btn => {
    btn.addEventListener('click', () => {
      abrirPanelCostosFactura(btn.dataset.facturaId);
    });
  });

  body.querySelectorAll('.btn-envio-factura').forEach(btn => {
    btn.addEventListener('click', () => {
      abrirPanelEnvioFactura(btn.dataset.facturaId);
    });
  });

  body.querySelectorAll('.btn-anular-factura').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmado = confirm('⚠️ Esta acción anulará la factura.\n\n¿Deseas continuar?');
      if (!confirmado) return;

      await cambiarEstadoFactura(btn.dataset.facturaId, 'ANU');
    });
  });

  body.querySelectorAll('.btn-activar-factura').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmado = confirm('¿Deseas activar nuevamente esta factura?');
      if (!confirmado) return;

      await reactivarFacturaSegunSaldo(
        btn.dataset.facturaId,
        btn.dataset.saldo
      );
    });
  });
}

function getClaseEstado(estadoCodigo) {
  if (estadoCodigo === 'CSP') return 'estado-saldoPendiente';
  if (estadoCodigo === 'ANU') return 'estado-anulada';
  if (estadoCodigo === 'CAN') return 'estado-cancelada';
  return '';
}

async function abrirFacturaGuardada(facturaId) {
  try {
    const factura = await obtenerFacturaCompleta(facturaId);
    mostrarFacturaDesdeBD(factura);
  } catch (error) {
    console.error('Error abriendo factura:', error);
    alert(error.message || 'No fue posible abrir la factura.');
  }
}

async function obtenerFacturaCompleta(facturaId) {
  const { data: factura, error: errorFactura } = await supabaseClient
    .from('facturas')
    .select(`
      id,
      factura_codigo,
      fecha,
      subtotal_factura,
      envio,
      costo_envio,
      direccion_entrega,
      desc_global,
      total_factura,
      pagado,
      observaciones,
      clientes (
        id,
        nombre,
        telefono,
        direccion_envio1,
        direccion_envio2,
        direccion_envio3
      ),
      origenes_factura (
        codigo,
        nombre
      ),
      estados_factura (
        codigo,
        nombre
      )
    `)
    .eq('id', facturaId)
    .single();

  if (errorFactura) {
    throw errorFactura;
  }

  const { data: detalles, error: errorDetalles } = await supabaseClient
    .from('detalle_factura')
    .select(`
      id,
      factura_id,
      cantidad,
      precio_unit,
      desc_prod,
      subtotal,
      imagen_producto,
      productos (
        id,
        producto_codigo,
        nombre,
        imagen_url
      )
    `)
    .eq('factura_id', facturaId)
    .order('created_at', { ascending: true });

  if (errorDetalles) {
    throw errorDetalles;
  }

  const { data: pagos, error: errorPagos } = await supabaseClient
    .from('pagos_factura')
    .select(`
      id,
      fecha,
      monto,
      nota,
      metodos_pago (
        codigo,
        nombre
      )
    `)
    .eq('factura_id', facturaId)
    .order('fecha', { ascending: true })
    .order('created_at', { ascending: true });

  if (errorPagos) {
    throw errorPagos;
  }

  return {
    factura,
    detalles: detalles || [],
    pagos: pagos || []
  };
}

function mostrarFacturaDesdeBD(payload) {
  const factura = payload.factura;
  const detalles = payload.detalles || [];

  const data = {
    origenCodigo: factura.origenes_factura?.codigo || '',
    fechaVenta: factura.fecha || '',
    clienteNombre: factura.clientes?.nombre || '',
    subtotalFactura: Number(factura.subtotal_factura || 0),
    envio: Number(factura.envio || 0),
    descGlobal: Number(factura.desc_global || 0),
    totalFactura: Number(factura.total_factura || 0),
    pagado: Number(factura.pagado || 0),
    saldoPendiente: Number(factura.total_factura || 0) - Number(factura.pagado || 0),
    productos: detalles.map(item => ({
      nombre: item.productos?.nombre || '',
      cantidad: Number(item.cantidad || 0),
      precioUnit: Number(item.precio_unit || 0),
      descuento: Number(item.desc_prod || 0),
      subtotal: Number(item.subtotal || 0),
      imagenUrl: item.imagen_producto || item.productos?.imagen_url || ''
    }))
  };

  mostrarFactura(
    data,
    { factura_codigo: factura.factura_codigo },
    factura.clientes?.nombre || ''
  );
}

function renderIndicadorCostos(estadoCostos) {
  switch (estadoCostos) {
    case 'COM':
      return `
        <span
          class="status-icon done"
          title="Costos completos"
          aria-label="Costos completos"
        >
          ✅
        </span>
      `;
    case 'PAR':
      return `
        <span
          class="status-icon partial"
          title="Costos parciales"
          aria-label="Costos parciales"
        >
          ⚠️
        </span>
      `;
    default:
      return `
        <span
          class="status-icon pending"
          title="Costos pendientes"
          aria-label="Costos pendientes"
        >
          ❌
        </span>
      `;
  }
}

function renderIndicadorEnvio(valor) {
  const activo = Boolean(valor);

  return `
    <span
      class="status-icon ${activo ? 'done' : 'pending'}"
      title="${activo ? 'Envío registrado' : 'Envío pendiente'}"
      aria-label="${activo ? 'Envío registrado' : 'Envío pendiente'}"
    >
      ${activo ? '✅' : '❌'}
    </span>
  `;
}


/* EDICIÓN DE FACTURAS
==================== */

async function abrirPanelEdicionFactura(facturaId) {
  cerrarPanelCostosFactura();
  cerrarPanelEnvioFactura();

  try {
    const payload = await obtenerFacturaCompleta(facturaId);
    facturaEdicionActual = payload;

    renderPanelEdicionFactura(payload);

    const panel = document.getElementById('edicionFacturaPanel');
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('Error abriendo edición de factura:', error);
    alert(error.message || 'No fue posible abrir la edición de la factura.');
  }
}

function renderPanelEdicionFactura(payload) {
  const factura = payload.factura;
  const detalles = payload.detalles || [];
  const pagos = payload.pagos || [];

  document.getElementById('edicionFacturaId').value = factura.id || '';
  document.getElementById('edicionFacturaClienteIdOriginal').value =
    factura.clientes?.id || '';

  document.getElementById('edicionFacturaTitulo').textContent =
    `Edición de factura | ${factura.factura_codigo || ''}`;

  document.getElementById('edicionFacturaResumen').textContent = [
    `Factura: ${factura.factura_codigo || ''}`,
    `Cliente: ${factura.clientes?.nombre || ''}`,
    `Fecha: ${formatearFechaFactura(factura.fecha || '')}`
  ].join(' | ');

  document.getElementById('clienteEdicionFactura').value =
    factura.clientes?.nombre || '';

  document.getElementById('fechaEdicionFactura').value = factura.fecha || '';

  document.getElementById('envioEdicionFactura').value =
    Number(factura.envio || 0);

  document.getElementById('descEdicionFactura').value =
    Number(factura.desc_global || 0);

  selectedClienteEdicion = factura.clientes
    ? {
        id: factura.clientes.id,
        nombre: factura.clientes.nombre || ''
      }
    : null;

  setOrigenEdicionActivo(factura.origenes_factura?.codigo || '');

  renderProductosEdicion(detalles);
  renderPagosEdicion(pagos);
  recalcularResumenEdicionFactura();
}

function setOrigenEdicionActivo(origenCodigo) {
  document.querySelectorAll('.edicion-origin-btn').forEach(btn => {
    btn.classList.toggle('active-origin', btn.dataset.origin === origenCodigo);
  });
}

function obtenerOrigenEdicionActivo() {
  const btn = document.querySelector('.edicion-origin-btn.active-origin');
  return btn ? btn.dataset.origin : '';
}

function renderProductosEdicion(detalles) {
  const container = document.getElementById('productosEdicionContainer');
  container.innerHTML = '';

  detalles.forEach((item, index) => {
    agregarFilaProductoEdicion({
      productoId: item.productos?.id || '',
      productoCodigo: item.productos?.producto_codigo || '',
      nombre: item.productos?.nombre || '',
      cantidad: Number(item.cantidad || 0),
      precioUnit: Number(item.precio_unit || 0),
      descuento: Number(item.desc_prod || 0),
      subtotal: Number(item.subtotal || 0),
      imagenUrl: item.imagen_producto || item.productos?.imagen_url || '',
      detalleFacturaIdOriginal: item.id || ''
    }, index + 1);
  });
}

function renderPagosEdicion(pagos) {
  const container = document.getElementById('pagosEdicionContainer');
  container.innerHTML = '';

  pagos.forEach((item, index) => {
    agregarFilaPagoEdicion({
      fecha: item.fecha || '',
      monto: Number(item.monto || 0),
      metodo: item.metodos_pago?.nombre || '',
      nota: item.nota || ''
    }, index + 1);
  });
}

function agregarFilaProductoEdicion(data = {}, index = null) {
  const container = document.getElementById('productosEdicionContainer');

  const row = document.createElement('div');
  row.className = 'producto-row';

  row.dataset.productoId = data.productoId || '';
  row.dataset.detalleOriginal = data.detalleFacturaIdOriginal || '';

  row.innerHTML = `
    <div class="item-card">
      <h4 class="item-card-title">Producto</h4>

      <div class="item-grid">
        <div class="field-group-inline">
          <label>Producto</label>
          <input
            type="text"
            class="producto-nombre"
            placeholder="Producto"
            value="${data.nombre || ''}"
          >
        </div>

        <div class="field-group-inline">
          <label>Cantidad</label>
          <input
            type="number"
            class="producto-cantidad"
            min="1"
            value="${data.cantidad || 1}"
          >
        </div>

        <div class="field-group-inline">
          <label>Precio unit.</label>
          <input
            type="number"
            class="producto-precio"
            min="0"
            step="0.01"
            value="${data.precioUnit || 0}"
          >
        </div>

        <div class="field-group-inline">
          <label>Desc.</label>
          <input
            type="number"
            class="producto-desc"
            min="0"
            step="0.01"
            value="${data.descuento || 0}"
          >
        </div>

        <button type="button" class="btn-remove">✕</button>
      </div>

      <div class="summary-row">
        <span>Subtotal</span>
        <strong class="producto-subtotal">
          C$ ${formatearMontoFactura(data.subtotal || 0)}
        </strong>
      </div>
    </div>
  `;

  container.appendChild(row);

  // Eventos
  row.querySelector('.producto-cantidad')
    .addEventListener('input', () => recalcularFilaProductoEdicion(row));

  row.querySelector('.producto-precio')
    .addEventListener('input', () => recalcularFilaProductoEdicion(row));

  row.querySelector('.producto-desc')
    .addEventListener('input', () => recalcularFilaProductoEdicion(row));

  row.querySelector('.btn-remove')
    .addEventListener('click', () => {
      row.remove();
      recalcularResumenEdicionFactura();
    });

  recalcularFilaProductoEdicion(row);
}

function recalcularFilaProductoEdicion(row) {
  const cantidad = Number(
    row.querySelector('.producto-cantidad').value || 0
  );

  const precio = Number(
    row.querySelector('.producto-precio').value || 0
  );

  const descuento = Number(
    row.querySelector('.producto-desc').value || 0
  );

  let subtotal = cantidad * precio - descuento;

  if (subtotal < 0) subtotal = 0;

  row.querySelector('.producto-subtotal').textContent =
    `C$ ${formatearMontoFactura(subtotal)}`;

  recalcularResumenEdicionFactura();
}

function agregarFilaPagoEdicion(data = {}, index = null) {
  const container = document.getElementById('pagosEdicionContainer');

  const row = document.createElement('div');
  row.className = 'pago-row';

  row.innerHTML = `
    <div class="item-card">
      <h4 class="item-card-title">Pago</h4>

      <div class="item-grid-pagos">
        <div class="field-group-inline">
          <label>Fecha</label>
          <input type="date" class="pago-fecha" value="${data.fecha || ''}">
        </div>

        <div class="field-group-inline">
          <label>Monto</label>
          <input
            type="number"
            class="pago-monto"
            min="0"
            step="0.01"
            value="${data.monto || 0}"
          >
        </div>

        <div class="field-group-inline">
          <label>Método</label>
          <input
            type="text"
            class="pago-metodo"
            placeholder="Método"
            value="${data.metodo || ''}"
          >
        </div>

        <button type="button" class="btn-remove">✕</button>
      </div>
    </div>
  `;

  container.appendChild(row);

  row.querySelector('.pago-monto')
    .addEventListener('input', recalcularResumenEdicionFactura);

  row.querySelector('.btn-remove')
    .addEventListener('click', () => {
      row.remove();
      recalcularResumenEdicionFactura();
    });
}

function recalcularResumenEdicionFactura() {
  const filas = document.querySelectorAll('#productosEdicionContainer .producto-row');

  let subtotal = 0;

  filas.forEach(row => {
    const cantidad = Number(row.querySelector('.producto-cantidad').value || 0);
    const precio = Number(row.querySelector('.producto-precio').value || 0);
    const descuento = Number(row.querySelector('.producto-desc').value || 0);

    let sub = cantidad * precio - descuento;
    if (sub < 0) sub = 0;

    subtotal += sub;
  });

  const envio = Number(document.getElementById('envioEdicionFactura').value || 0);
  const descGlobal = Number(document.getElementById('descEdicionFactura').value || 0);

  let total = subtotal + envio - descGlobal;
  if (total < 0) total = 0;

  // pagos
  let pagado = 0;
  document.querySelectorAll('#pagosEdicionContainer .pago-monto')
    .forEach(input => {
      pagado += Number(input.value || 0);
    });

  const saldo = total - pagado;

  document.getElementById('subtotalEdicionResumen').textContent =
    `C$ ${formatearMontoFactura(subtotal)}`;

  document.getElementById('totalEdicionResumen').textContent =
    `C$ ${formatearMontoFactura(total)}`;

  document.getElementById('pagadoEdicionResumen').textContent =
    `C$ ${formatearMontoFactura(pagado)}`;

  document.getElementById('saldoEdicionResumen').textContent =
    `C$ ${formatearMontoFactura(saldo)}`;
}

function cerrarPanelEdicionFactura() {
  document.getElementById('edicionFacturaPanel').classList.add('hidden');
  document.getElementById('edicionFacturaId').value = '';
  document.getElementById('edicionFacturaClienteIdOriginal').value = '';
  document.getElementById('edicionFacturaTitulo').textContent =
    'Edición de factura';
  document.getElementById('edicionFacturaResumen').textContent =
    'Selecciona una factura para editarla.';

  document.getElementById('clienteEdicionFactura').value = '';
  document.getElementById('fechaEdicionFactura').value = '';
  document.getElementById('envioEdicionFactura').value = 0;
  document.getElementById('descEdicionFactura').value = 0;

  document.getElementById('productosEdicionContainer').innerHTML = '';
  document.getElementById('pagosEdicionContainer').innerHTML = '';

  document.getElementById('subtotalEdicionResumen').textContent = 'C$ 0.00';
  document.getElementById('totalEdicionResumen').textContent = 'C$ 0.00';
  document.getElementById('pagadoEdicionResumen').textContent = 'C$ 0.00';
  document.getElementById('saldoEdicionResumen').textContent = 'C$ 0.00';

  document.querySelectorAll('.edicion-origin-btn').forEach(btn => {
    btn.classList.remove('active-origin');
  });

  facturaEdicionActual = null;
  selectedClienteEdicion = null;
}

async function obtenerCostosFacturaMap(facturaId) {
  const { data, error } = await supabaseClient
    .from('costos_producto')
    .select(`
      id,
      factura_id,
      detalle_factura_id,
      producto_id,
      cantidad,
      mo_unitario,
      materiales_unitario,
      costo_unitario,
      total_mo,
      total_materiales,
      total_costo,
      observacion
    `)
    .eq('factura_id', facturaId);

  if (error) throw error;

  const map = new Map();

  (data || []).forEach(item => {
    if (item.producto_id) {
      map.set(item.producto_id, item);
    }
  });

  return map;
}

function obtenerProductosEdicionFormulario() {
  const rows = [...document.querySelectorAll(
    '#productosEdicionContainer .producto-row'
  )];

  return rows.map((row, index) => {
    const nombre = normalizarTexto(
      row.querySelector('.producto-nombre').value
    );

    const cantidad = redondear2(parseFloat(
      row.querySelector('.producto-cantidad').value || '0'
    ));

    const precioUnit = redondear2(parseFloat(
      row.querySelector('.producto-precio').value || '0'
    ));

    const descuento = redondear2(parseFloat(
      row.querySelector('.producto-desc').value || '0'
    ));

    let subtotal = cantidad * precioUnit - descuento;
    if (subtotal < 0) subtotal = 0;
    subtotal = redondear2(subtotal);

    return {
      index: index + 1,
      row,
      detalleFacturaIdOriginal: row.dataset.detalleOriginal || '',
      productoId: row.dataset.productoId || '',
      nombre,
      cantidad,
      precioUnit,
      descuento,
      subtotal
    };
  });
}

function obtenerPagosEdicionFormulario() {
  const rows = [...document.querySelectorAll(
    '#pagosEdicionContainer .pago-row'
  )];

  return rows.map((row, index) => {
    const fecha = row.querySelector('.pago-fecha').value;
    const monto = redondear2(parseFloat(
      row.querySelector('.pago-monto').value || '0'
    ));
    const metodo = normalizarTexto(
      row.querySelector('.pago-metodo').value
    );

    return {
      index: index + 1,
      fecha,
      monto,
      metodo,
      nota: null
    };
  });
}

function obtenerDatosEdicionFacturaFormulario() {
  const clienteNombre = normalizarTexto(
    document.getElementById('clienteEdicionFactura').value
  );

  const fechaVenta = document.getElementById('fechaEdicionFactura').value;
  const origenCodigo = obtenerOrigenEdicionActivo();
  const envio = redondear2(parseFloat(
    document.getElementById('envioEdicionFactura').value || '0'
  ));
  const descGlobal = redondear2(parseFloat(
    document.getElementById('descEdicionFactura').value || '0'
  ));

  const productos = obtenerProductosEdicionFormulario();
  const pagos = obtenerPagosEdicionFormulario();

  const subtotalFactura = redondear2(
    productos.reduce((acc, item) => acc + item.subtotal, 0)
  );

  const totalFactura = redondear2(
    Math.max(subtotalFactura + envio - descGlobal, 0)
  );

  const pagado = redondear2(
    pagos.reduce((acc, item) => acc + item.monto, 0)
  );

  const saldoPendiente = redondear2(
    Math.max(totalFactura - pagado, 0)
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
    saldoPendiente,
    productos,
    pagos
  };
}

function validarDatosEdicionFactura(data) {
  const errores = [];

  if (!data.clienteNombre) {
    errores.push('Debes ingresar el nombre del cliente.');
  }

  if (!data.fechaVenta) {
    errores.push('Debes indicar la fecha de la factura.');
  }

  if (!data.origenCodigo) {
    errores.push('Debes seleccionar el origen.');
  }

  const productosValidos = data.productos.filter(item => item.nombre);
  if (!productosValidos.length) {
    errores.push('Debes ingresar al menos un producto.');
  }

  const productoIds = new Set();

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

    if (item.productoId) {
      if (productoIds.has(item.productoId)) {
        errores.push(`No se puede repetir el mismo producto en la factura.`);
      }
      productoIds.add(item.productoId);
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
    errores.push('El envío cobrado no puede ser negativo.');
  }

  if (data.descGlobal < 0) {
    errores.push('El descuento global no puede ser negativo.');
  }

  if (data.pagado > data.totalFactura) {
    errores.push('El total pagado no puede ser mayor que el total de la factura.');
  }

  return errores;
}

async function actualizarFacturaEncabezado(facturaId, data, clienteId) {
  const origenFacturaId = ventaCatalogos.origenes[data.origenCodigo];

  if (!origenFacturaId) {
    throw new Error(`No se encontró el origen ${data.origenCodigo}.`);
  }

  const updatePayload = {
    fecha: data.fechaVenta,
    cliente_id: clienteId,
    subtotal_factura: data.subtotalFactura,
    envio: data.envio,
    desc_global: data.descGlobal,
    total_factura: data.totalFactura,
    pagado: data.pagado,
    origen_factura_id: origenFacturaId
  };

  const clienteOriginalId = document.getElementById(
    'edicionFacturaClienteIdOriginal'
  ).value;

  if (clienteOriginalId && clienteOriginalId !== clienteId) {
    updatePayload.costo_envio = null;
    updatePayload.direccion_entrega = null;
  }

  const { error } = await supabaseClient
    .from('facturas')
    .update(updatePayload)
    .eq('id', facturaId);

  if (error) throw error;
}

async function reemplazarPagosFacturaEdicion(facturaId, clienteId, pagos) {
  const { error: deleteError } = await supabaseClient
    .from('pagos_factura')
    .delete()
    .eq('factura_id', facturaId);

  if (deleteError) throw deleteError;

  await insertarPagosFactura(facturaId, clienteId, pagos);
}

async function reemplazarDetalleYCostosEdicion(
  facturaId,
  productos,
  origenCodigo
) {
  const costosPreviosMap = await obtenerCostosFacturaMap(facturaId);

  const { data: detallesPrevios, error: errorPrevios } = await supabaseClient
    .from('detalle_factura')
    .select(`
      id,
      factura_id,
      producto_id,
      cantidad,
      precio_unit,
      desc_prod,
      subtotal,
      imagen_producto
    `)
    .eq('factura_id', facturaId);

  if (errorPrevios) throw errorPrevios;

  const imagenesPreviasMap = new Map();
  (detallesPrevios || []).forEach(item => {
    if (item.producto_id) {
      imagenesPreviasMap.set(item.producto_id, item.imagen_producto || null);
    }
  });

  const { error: deleteCostosError } = await supabaseClient
    .from('costos_producto')
    .delete()
    .eq('factura_id', facturaId);

  if (deleteCostosError) throw deleteCostosError;

  const { error: deleteDetallesError } = await supabaseClient
    .from('detalle_factura')
    .delete()
    .eq('factura_id', facturaId);

  if (deleteDetallesError) throw deleteDetallesError;

  const detallesInsert = [];

  for (const item of productos) {
    if (!item.nombre) continue;

    const producto = await obtenerProductoId(item, origenCodigo);

    let imagenProducto = imagenesPreviasMap.get(producto.id) || null;

    if (!imagenProducto) {
      imagenProducto = await sincronizarImagenProducto(item, producto);
    }

    detallesInsert.push({
      factura_id: facturaId,
      producto_id: producto.id,
      cantidad: item.cantidad,
      precio_unit: item.precioUnit,
      desc_prod: item.descuento,
      subtotal: item.subtotal,
      imagen_producto: imagenProducto || null
    });

    item.productoId = producto.id;
    item.productoCodigo = producto.producto_codigo || '';
    item.imagenUrl = imagenProducto || producto.imagen_url || '';
  }

  if (!detallesInsert.length) {
    return;
  }

  const { data: detallesNuevos, error: insertDetallesError } = await supabaseClient
    .from('detalle_factura')
    .insert(detallesInsert)
    .select(`
      id,
      factura_id,
      producto_id,
      cantidad,
      precio_unit,
      desc_prod,
      subtotal,
      imagen_producto
    `);

  if (insertDetallesError) throw insertDetallesError;

  const costosInsert = [];

  (detallesNuevos || []).forEach(detalleNuevo => {
    const costoPrevio = costosPreviosMap.get(detalleNuevo.producto_id);

    if (!costoPrevio) return;

    const cantidad = Number(detalleNuevo.cantidad || 0);
    const moUnit = Number(costoPrevio.mo_unitario || 0);
    const materialesUnit = Number(costoPrevio.materiales_unitario || 0);
    const costoUnit = redondear2(moUnit + materialesUnit);
    const totalMo = redondear2(cantidad * moUnit);
    const totalMateriales = redondear2(cantidad * materialesUnit);
    const totalCosto = redondear2(cantidad * costoUnit);

    costosInsert.push({
      factura_id: facturaId,
      detalle_factura_id: detalleNuevo.id,
      producto_id: detalleNuevo.producto_id,
      cantidad,
      mo_unitario: moUnit,
      materiales_unitario: materialesUnit,
      costo_unitario: costoUnit,
      total_mo: totalMo,
      total_materiales: totalMateriales,
      total_costo: totalCosto,
      observacion: costoPrevio.observacion || null
    });
  });

  if (costosInsert.length) {
    const { error: insertCostosError } = await supabaseClient
      .from('costos_producto')
      .insert(costosInsert);

    if (insertCostosError) throw insertCostosError;
  }
}

async function guardarCambiosFactura() {
  try {
    if (!facturaEdicionActual?.factura?.id) {
      throw new Error('No hay una factura cargada para editar.');
    }

    setEstadoBotonGuardarEdicion(true);
    await cargarCatalogosVenta();

    const facturaId = facturaEdicionActual.factura.id;
    const data = obtenerDatosEdicionFacturaFormulario();
    const errores = validarDatosEdicionFactura(data);

    if (errores.length) {
      alert(errores.join('\n'));
      return;
    }

    const clienteId = await obtenerClienteIdEdicion(data.clienteNombre);

    await actualizarFacturaEncabezado(facturaId, data, clienteId);
    await reemplazarDetalleYCostosEdicion(
      facturaId,
      data.productos,
      data.origenCodigo
    );
    await reemplazarPagosFacturaEdicion(facturaId, clienteId, data.pagos);

    alert('Factura editada correctamente.');
    await buscarFacturas();
    await abrirPanelEdicionFactura(facturaId);
  } catch (error) {
    console.error('Error guardando cambios de factura:', error);
    alert(error.message || 'No fue posible guardar los cambios de la factura.');
  } finally {
    setEstadoBotonGuardarEdicion(false);
  }
}

async function obtenerClienteIdEdicion(clienteNombre) {
  if (
    selectedClienteEdicion &&
    normalizarTexto(selectedClienteEdicion.nombre).toLowerCase() ===
      clienteNombre.toLowerCase()
  ) {
    return selectedClienteEdicion.id;
  }

  const { data, error } = await supabaseClient
    .from('clientes')
    .select('id, nombre, cliente_codigo')
    .ilike('nombre', clienteNombre)
    .limit(1);

  if (error) throw error;

  if (data && data.length) {
    selectedClienteEdicion = data[0];
    return data[0].id;
  }

  const clienteNuevo = await crearClienteNuevo(clienteNombre);
  selectedClienteEdicion = clienteNuevo;
  return clienteNuevo.id;
}

function setEstadoBotonGuardarEdicion(guardando) {
  const btn = document.getElementById('btnGuardarCambiosFactura');
  if (!btn) return;

  btn.disabled = guardando;
  btn.textContent = guardando ? 'Guardando...' : 'Guardar cambios';
}

function renderBotonEstadoFactura(item) {
  const estado = item.estado_codigo || '';

  if (estado === 'ANU') {
    return `
      <button
        type="button"
        class="table-action-btn btn-activar-factura"
        data-factura-id="${item.id}"
        data-saldo="${Number(item.saldo_pendiente || 0)}"
      >
        Activar
      </button>
    `;
  }

  return `
    <button
      type="button"
      class="table-action-btn btn-anular-factura"
      data-factura-id="${item.id}"
    >
      Anular
    </button>
  `;
}

async function cambiarEstadoFactura(facturaId, nuevoCodigoEstado) {
  try {
    const { data: estado, error: errorEstado } = await supabaseClient
      .from('estados_factura')
      .select('id, codigo, nombre')
      .eq('codigo', nuevoCodigoEstado)
      .single();

    if (errorEstado) {
      throw errorEstado;
    }

    const { error: errorUpdate } = await supabaseClient
      .from('facturas')
      .update({
        estado_factura_id: estado.id
      })
      .eq('id', facturaId);

    if (errorUpdate) {
      throw errorUpdate;
    }

    await buscarFacturas();
  } catch (error) {
    console.error('Error cambiando estado de factura:', error);
    alert(error.message || 'No fue posible cambiar el estado de la factura.');
  }
}

async function reactivarFacturaSegunSaldo(facturaId, saldoPendiente) {
  const saldo = Number(saldoPendiente || 0);
  const codigoDestino = saldo <= 0 ? 'CAN' : 'CSP';
  await cambiarEstadoFactura(facturaId, codigoDestino);
}


/* CARGA DE COSTOS POR FACTURA-PRODUCTO
==================== */

let facturaCostosActual = null;

async function abrirPanelCostosFactura(facturaId) {
  
  cerrarPanelEnvioFactura();
  
  try {
    const payload = await obtenerFacturaCompletaConCostos(facturaId);
    facturaCostosActual = payload;
    renderPanelCostosFactura(payload);

    const panel = document.getElementById('costosFacturaPanel');
    panel.classList.remove('hidden');
    panel.classList.add('costos-panel-open');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('Error abriendo panel de costos:', error);
    alert(error.message || 'No fue posible cargar los costos de la factura.');
  }
}

async function obtenerFacturaCompletaConCostos(facturaId) {
  const payload = await obtenerFacturaCompleta(facturaId);

  const { data: costos, error } = await supabaseClient
    .from('costos_producto')
    .select(`
      id,
      factura_id,
      detalle_factura_id,
      producto_id,
      cantidad,
      mo_unitario,
      materiales_unitario,
      costo_unitario,
      total_mo,
      total_materiales,
      total_costo,
      observacion
    `)
    .eq('factura_id', facturaId);

  if (error) {
    throw error;
  }

  return {
    ...payload,
    costos: costos || []
  };
}

function renderPanelCostosFactura(payload) {
  const factura = payload.factura;
  const detalles = payload.detalles || [];
  const costos = payload.costos || [];

  const panel = document.getElementById('costosFacturaPanel');
  const resumen = document.getElementById('costosFacturaResumen');
  const empty = document.getElementById('costosFacturaEmpty');
  const table = document.getElementById('tablaCostosFactura');
  const body = document.getElementById('tablaCostosFacturaBody');
  const totalesCard = document.getElementById('costosFacturaTotales');

  body.innerHTML = '';

  resumen.textContent = [
    `Factura: ${factura.factura_codigo || ''}`,
    `Cliente: ${factura.clientes?.nombre || ''}`,
    `Fecha: ${formatearFechaFactura(factura.fecha || '')}`
  ].join(' | ');

  if (!detalles.length) {
    empty.textContent = 'La factura no tiene productos para cargar costos.';
    empty.classList.remove('hidden');
    table.classList.add('hidden');
    totalesCard.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  table.classList.remove('hidden');
  totalesCard.classList.remove('hidden');

  detalles.forEach((detalle, index) => {
    const costoExistente = costos.find(item =>
      item.detalle_factura_id === detalle.id
    );

    const cantidad = Number(detalle.cantidad || 0);
    const precioUnit = Number(detalle.precio_unit || 0);
    const subtotalVenta = Number(detalle.subtotal || 0);
    const moUnit = Number(costoExistente?.mo_unitario || 0);
    const materialesUnit = Number(costoExistente?.materiales_unitario || 0);
    const costoUnit = redondear2(moUnit + materialesUnit);
    const totalMo = redondear2(cantidad * moUnit);
    const totalMateriales = redondear2(cantidad * materialesUnit);
    const totalCosto = redondear2(cantidad * costoUnit);

    const tr = document.createElement('tr');
    tr.dataset.detalleFacturaId = detalle.id;
    tr.dataset.facturaId = factura.id;
    tr.dataset.productoId = detalle.productos?.id || '';
    tr.dataset.cantidad = cantidad;

    tr.innerHTML = `
      <td>${escapeHtml(detalle.productos?.producto_codigo || '')}</td>
      <td>${escapeHtml(detalle.productos?.nombre || '')}</td>
      <td>${cantidad}</td>
      <td>C$ ${formatearMontoFactura(precioUnit)}</td>
      <td>C$ ${formatearMontoFactura(subtotalVenta)}</td>
      <td>
        <input
          type="number"
          class="cost-input input-mo-unitario"
          min="0"
          step="0.01"
          value="${moUnit}"
        >
      </td>
      <td>
        <input
          type="number"
          class="cost-input input-materiales-unitario"
          min="0"
          step="0.01"
          value="${materialesUnit}"
        >
      </td>
      <td class="cost-readonly cell-costo-unitario">
        C$ ${formatearMontoFactura(costoUnit)}
      </td>
      <td class="cost-readonly cell-total-mo">
        C$ ${formatearMontoFactura(totalMo)}
      </td>
      <td class="cost-readonly cell-total-materiales">
        C$ ${formatearMontoFactura(totalMateriales)}
      </td>
      <td class="cost-readonly cell-total-costo">
        C$ ${formatearMontoFactura(totalCosto)}
      </td>
    `;

    body.appendChild(tr);
  });

  activarCalculoTablaCostos();
  recalcularTotalesCostosFactura();
}

function activarCalculoTablaCostos() {
  document.querySelectorAll('#tablaCostosFacturaBody tr').forEach(row => {
    const inputMo = row.querySelector('.input-mo-unitario');
    const inputMateriales = row.querySelector('.input-materiales-unitario');

    [inputMo, inputMateriales].forEach(input => {
      input.addEventListener('input', () => {
        recalcularFilaCosto(row);
        recalcularTotalesCostosFactura();
      });
    });
  });
}

function recalcularFilaCosto(row) {
  const cantidad = Number(row.dataset.cantidad || 0);
  const moUnit = redondear2(
    parseFloat(row.querySelector('.input-mo-unitario').value || '0')
  );
  const materialesUnit = redondear2(
    parseFloat(row.querySelector('.input-materiales-unitario').value || '0')
  );

  const costoUnit = redondear2(moUnit + materialesUnit);
  const totalMo = redondear2(cantidad * moUnit);
  const totalMateriales = redondear2(cantidad * materialesUnit);
  const totalCosto = redondear2(cantidad * costoUnit);

  row.querySelector('.cell-costo-unitario').textContent =
    `C$ ${formatearMontoFactura(costoUnit)}`;

  row.querySelector('.cell-total-mo').textContent =
    `C$ ${formatearMontoFactura(totalMo)}`;

  row.querySelector('.cell-total-materiales').textContent =
    `C$ ${formatearMontoFactura(totalMateriales)}`;

  row.querySelector('.cell-total-costo').textContent =
    `C$ ${formatearMontoFactura(totalCosto)}`;
}

function recalcularTotalesCostosFactura() {
  const rows = [...document.querySelectorAll('#tablaCostosFacturaBody tr')];

  const totalMo = rows.reduce((acc, row) => {
    const cantidad = Number(row.dataset.cantidad || 0);
    const moUnit = redondear2(
      parseFloat(row.querySelector('.input-mo-unitario').value || '0')
    );
    return acc + redondear2(cantidad * moUnit);
  }, 0);

  const totalMateriales = rows.reduce((acc, row) => {
    const cantidad = Number(row.dataset.cantidad || 0);
    const materialesUnit = redondear2(
      parseFloat(row.querySelector('.input-materiales-unitario').value || '0')
    );
    return acc + redondear2(cantidad * materialesUnit);
  }, 0);

  const totalGeneral = redondear2(totalMo + totalMateriales);

  document.getElementById('costosFacturaTotalMo').textContent =
    `C$ ${formatearMontoFactura(totalMo)}`;

  document.getElementById('costosFacturaTotalMateriales').textContent =
    `C$ ${formatearMontoFactura(totalMateriales)}`;

  document.getElementById('costosFacturaTotalGeneral').textContent =
    `C$ ${formatearMontoFactura(totalGeneral)}`;
}

function obtenerCostosFacturaFormulario() {
  const rows = [...document.querySelectorAll('#tablaCostosFacturaBody tr')];

  return rows.map(row => {
    const facturaId = row.dataset.facturaId;
    const detalleFacturaId = row.dataset.detalleFacturaId;
    const productoId = row.dataset.productoId;
    const cantidad = redondear2(Number(row.dataset.cantidad || 0));
    const moUnit = redondear2(
      parseFloat(row.querySelector('.input-mo-unitario').value || '0')
    );
    const materialesUnit = redondear2(
      parseFloat(row.querySelector('.input-materiales-unitario').value || '0')
    );
    const costoUnit = redondear2(moUnit + materialesUnit);
    const totalMo = redondear2(cantidad * moUnit);
    const totalMateriales = redondear2(cantidad * materialesUnit);
    const totalCosto = redondear2(cantidad * costoUnit);

    return {
      factura_id: facturaId,
      detalle_factura_id: detalleFacturaId,
      producto_id: productoId || null,
      cantidad,
      mo_unitario: moUnit,
      materiales_unitario: materialesUnit,
      costo_unitario: costoUnit,
      total_mo: totalMo,
      total_materiales: totalMateriales,
      total_costo: totalCosto,
      observacion: null
    };
  });
}

async function guardarCostosFacturaActual() {
  try {
    if (!facturaCostosActual?.factura?.id) {
      throw new Error('No hay factura seleccionada para guardar costos.');
    }

    const facturaId = facturaCostosActual.factura.id;
    const payload = obtenerCostosFacturaFormulario();

    const btn = document.getElementById('btnGuardarCostosFactura');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const { error: deleteError } = await supabaseClient
      .from('costos_producto')
      .delete()
      .eq('factura_id', facturaId);

    if (deleteError) {
      throw deleteError;
    }

    if (payload.length) {
      const { error: insertError } = await supabaseClient
        .from('costos_producto')
        .insert(payload);

      if (insertError) {
        throw insertError;
      }
    }

    alert('Costos guardados correctamente.');
    await abrirPanelCostosFactura(facturaId);
  } catch (error) {
    console.error('Error guardando costos:', error);
    alert(error.message || 'No fue posible guardar los costos.');
  } finally {
    const btn = document.getElementById('btnGuardarCostosFactura');
    btn.disabled = false;
    btn.textContent = 'Guardar costos';
  }
}

function cerrarPanelCostosFactura() {
  document.getElementById('costosFacturaPanel').classList.add('hidden');
  document.getElementById('tablaCostosFacturaBody').innerHTML = '';
  document.getElementById('tablaCostosFactura').classList.add('hidden');
  document.getElementById('costosFacturaTotales').classList.add('hidden');
  document.getElementById('costosFacturaEmpty').classList.remove('hidden');
  facturaCostosActual = null;
}


/* CARGA DE COSTOS POR ENVIO
==================== */

let facturaEnvioActual = null;

async function abrirPanelEnvioFactura(facturaId) {
  
  cerrarPanelCostosFactura();

  try {
    const payload = await obtenerFacturaCompleta(facturaId);
    facturaEnvioActual = payload;

    renderPanelEnvioFactura(payload);

    const panel = document.getElementById('envioFacturaPanel');
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('Error abriendo panel de envío:', error);
    alert(error.message || 'No fue posible abrir el registro de envío.');
  }
}

function renderPanelEnvioFactura(payload) {
  const factura = payload.factura;
  const cliente = factura.clientes || {};

  document.getElementById('envioFacturaResumen').textContent = [
    `Factura: ${factura.factura_codigo || ''}`,
    `Cliente: ${cliente.nombre || ''}`,
    `Fecha: ${formatearFechaFactura(factura.fecha || '')}`
  ].join(' | ');

  document.getElementById('costoEnvioFactura').value =
    Number(factura.costo_envio || 0);

  document.getElementById('direccionEnvio1Factura').value =
    cliente.direccion_envio1 || '';

  document.getElementById('direccionEnvio2Factura').value =
    cliente.direccion_envio2 || '';

  document.getElementById('direccionEnvio3Factura').value =
    cliente.direccion_envio3 || '';

  document
    .querySelectorAll('input[name="direccionEnvioSeleccionada"]')
    .forEach(radio => {
      radio.checked = false;
    });

  const direccionEntrega = normalizarTexto(factura.direccion_entrega || '');

  if (direccionEntrega) {
    const direccion1 = normalizarTexto(cliente.direccion_envio1 || '');
    const direccion2 = normalizarTexto(cliente.direccion_envio2 || '');
    const direccion3 = normalizarTexto(cliente.direccion_envio3 || '');

    if (direccionEntrega === direccion1 && direccion1) {
      document.querySelector(
        'input[name="direccionEnvioSeleccionada"][value="1"]'
      ).checked = true;
    } else if (direccionEntrega === direccion2 && direccion2) {
      document.querySelector(
        'input[name="direccionEnvioSeleccionada"][value="2"]'
      ).checked = true;
    } else if (direccionEntrega === direccion3 && direccion3) {
      document.querySelector(
        'input[name="direccionEnvioSeleccionada"][value="3"]'
      ).checked = true;
    }
  }

  bloquearCamposDireccionEnvio();
  habilitarSoloDireccionSeleccionada();
  activarCambioDireccionEnvio();
}

function obtenerDireccionEnvioSeleccionada() {
  const radio = document.querySelector(
    'input[name="direccionEnvioSeleccionada"]:checked'
  );

  if (!radio) {
    return null;
  }

  return radio.value;
}

function obtenerDatosEnvioFormulario() {
  const costoEnvio = redondear2(
    parseFloat(document.getElementById('costoEnvioFactura').value || '0')
  );

  const direccion1 = normalizarTexto(
    document.getElementById('direccionEnvio1Factura').value
  );

  const direccion2 = normalizarTexto(
    document.getElementById('direccionEnvio2Factura').value
  );

  const direccion3 = normalizarTexto(
    document.getElementById('direccionEnvio3Factura').value
  );

  const direccionSeleccionada = obtenerDireccionEnvioSeleccionada();

  const mapaDirecciones = {
    '1': direccion1,
    '2': direccion2,
    '3': direccion3
  };

  return {
    costoEnvio,
    direccion1,
    direccion2,
    direccion3,
    direccionSeleccionada,
    direccionValorSeleccionada: direccionSeleccionada
      ? mapaDirecciones[direccionSeleccionada]
      : ''
  };
}

function validarDatosEnvioFormulario(data) {
  const errores = [];

  if (data.costoEnvio < 0) {
    errores.push('El costo de envío no puede ser negativo.');
  }

  if (!data.direccionSeleccionada) {
    errores.push('Debes seleccionar una dirección de envío.');
  }

  if (
    data.direccionSeleccionada &&
    !data.direccionValorSeleccionada
  ) {
    errores.push('La dirección seleccionada no puede estar vacía.');
  }

  return errores;
}

async function guardarEnvioFacturaActual() {
  try {
    if (!facturaEnvioActual?.factura?.id) {
      throw new Error('No hay factura seleccionada para guardar envío.');
    }

    const factura = facturaEnvioActual.factura;
    const cliente = factura.clientes || {};
    const datos = obtenerDatosEnvioFormulario();
    const errores = validarDatosEnvioFormulario(datos);

    if (errores.length) {
      alert(errores.join('\n'));
      return;
    }

    const btn = document.getElementById('btnGuardarEnvioFactura');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const { error: errorCliente } = await supabaseClient
      .from('clientes')
      .update({
        direccion_envio1: datos.direccion1 || null,
        direccion_envio2: datos.direccion2 || null,
        direccion_envio3: datos.direccion3 || null
      })
      .eq('id', cliente.id);

    if (errorCliente) {
      throw errorCliente;
    }

    const { error: errorFactura } = await supabaseClient
      .from('facturas')
      .update({
        costo_envio: datos.costoEnvio,
        direccion_entrega: datos.direccionValorSeleccionada || null
      })
      .eq('id', factura.id);

    if (errorFactura) {
      throw errorFactura;
    }

    alert('Registro de envío guardado correctamente.');
    await abrirPanelEnvioFactura(factura.id);
  } catch (error) {
    console.error('Error guardando envío:', error);
    alert(error.message || 'No fue posible guardar el registro de envío.');
  } finally {
    const btn = document.getElementById('btnGuardarEnvioFactura');
    btn.disabled = false;
    btn.textContent = 'Guardar envío';
  }
}

function cerrarPanelEnvioFactura() {
  document.getElementById('envioFacturaPanel').classList.add('hidden');
  document.getElementById('costoEnvioFactura').value = 0;
  document.getElementById('direccionEnvio1Factura').value = '';
  document.getElementById('direccionEnvio2Factura').value = '';
  document.getElementById('direccionEnvio3Factura').value = '';

  document
    .querySelectorAll('input[name="direccionEnvioSeleccionada"]')
    .forEach(radio => {
      radio.checked = false;
    });

  bloquearCamposDireccionEnvio();
  facturaEnvioActual = null;
}

function bloquearCamposDireccionEnvio() {
  ['1', '2', '3'].forEach(numero => {
    const input = document.getElementById(`direccionEnvio${numero}Factura`);
    if (input) {
      input.disabled = true;
    }
  });
}

function habilitarSoloDireccionSeleccionada() {
  const seleccionada = obtenerDireccionEnvioSeleccionada();

  ['1', '2', '3'].forEach(numero => {
    const input = document.getElementById(`direccionEnvio${numero}Factura`);
    if (!input) return;

    input.disabled = numero !== seleccionada;
  });
}

function activarCambioDireccionEnvio() {
  document
    .querySelectorAll('input[name="direccionEnvioSeleccionada"]')
    .forEach(radio => {
      radio.addEventListener('change', () => {
        habilitarSoloDireccionSeleccionada();
      });
    });
}


/* GESTIÓN CLIENTES
========================= */

function limpiarFormularioCliente() {
  document.getElementById('clienteId').value = '';
  document.getElementById('clienteCodigoForm').value = '';
  document.getElementById('clienteNombreForm').value = '';
  document.getElementById('clienteTelefonoForm').value = '';
  document.getElementById('clienteDireccion1Form').value = '';
  document.getElementById('clienteDireccion2Form').value = '';
  document.getElementById('clienteDireccion3Form').value = '';
  document.getElementById('clienteNotaForm').value = '';
  document.getElementById('clienteActivoForm').checked = true;

  document.getElementById('clienteFormTitulo').textContent = 'Nuevo cliente';

  /*
  const btnToggle = document.getElementById('btnToggleEstadoCliente');
  btnToggle.classList.add('hidden');
  btnToggle.textContent = 'Cambiar a inactivo';
  */

}

function obtenerDatosFormularioCliente() {
  return {
    id: document.getElementById('clienteId').value.trim(),
    cliente_codigo: document.getElementById('clienteCodigoForm').value.trim(),
    nombre: normalizarTexto(document.getElementById('clienteNombreForm').value),
    telefono: normalizarTexto(document.getElementById('clienteTelefonoForm').value),
    direccion_envio1: normalizarTexto(document.getElementById('clienteDireccion1Form').value),
    direccion_envio2: normalizarTexto(document.getElementById('clienteDireccion2Form').value),
    direccion_envio3: normalizarTexto(document.getElementById('clienteDireccion3Form').value),
    nota: normalizarTexto(document.getElementById('clienteNotaForm').value),
    activo: document.getElementById('clienteActivoForm').checked
  };
}

function validarFormularioCliente(data) {
  const errores = [];

  if (!data.nombre) {
    errores.push('Debes ingresar el nombre del cliente.');
  }

  return errores;
}

async function buscarClientesGestion() {
  try {
    const texto = normalizarTexto(
      document.getElementById('filtroClienteTexto').value
    );

    const telefono = normalizarTexto(
      document.getElementById('filtroClienteTelefono').value
    );

    const estado = document.getElementById('filtroClienteEstado').value;

    let query = supabaseClient
      .from('clientes')
      .select(`
        id,
        cliente_codigo,
        nombre,
        telefono,
        direccion_envio1,
        direccion_envio2,
        direccion_envio3,
        nota,
        activo,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (texto) {
      query = query.or(
        `cliente_codigo.ilike.%${texto}%,nombre.ilike.%${texto}%`
      );
    }

    if (telefono) {
      query = query.ilike('telefono', `%${telefono}%`);
    }

    if (estado === 'activos') {
      query = query.eq('activo', true);
    } else if (estado === 'inactivos') {
      query = query.eq('activo', false);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    renderTablaClientes(data || []);
  } catch (error) {
    console.error('Error buscando clientes:', error);
    alert(error.message || 'Ocurrió un error al buscar clientes.');
  }
}

function renderTablaClientes(clientes) {
  const table = document.getElementById('tablaClientes');
  const body = document.getElementById('tablaClientesBody');
  const empty = document.getElementById('clientesEmptyState');

  body.innerHTML = '';

  if (!clientes.length) {
    table.classList.add('hidden');
    empty.textContent = 'No se encontraron clientes con esos filtros.';
    return;
  }

  empty.textContent = '';
  table.classList.remove('hidden');

  clientes.forEach(item => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(item.cliente_codigo || '')}</td>
      <td>${escapeHtml(item.nombre || '')}</td>
      <td>${escapeHtml(item.telefono || '')}</td>
      <td>${escapeHtml(item.direccion_envio1 || '')}</td>
      <td>${item.activo ? 'Activo' : 'Inactivo'}</td>
      <td>
        <button
          type="button"
          class="table-action-btn"
          data-cliente-id="${item.id}"
        >
          Editar
        </button>
      </td>
    `;

    body.appendChild(tr);
  });

  body.querySelectorAll('.table-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cargarClienteEnFormulario(btn.dataset.clienteId);
    });
  });
}

async function cargarClienteEnFormulario(clienteId) {
  try {
    const { data, error } = await supabaseClient
      .from('clientes')
      .select(`
        id,
        cliente_codigo,
        nombre,
        telefono,
        direccion_envio1,
        direccion_envio2,
        direccion_envio3,
        nota,
        activo
      `)
      .eq('id', clienteId)
      .single();

    if (error) {
      throw error;
    }

    document.getElementById('clienteId').value = data.id || '';
    document.getElementById('clienteCodigoForm').value = data.cliente_codigo || '';
    document.getElementById('clienteNombreForm').value = data.nombre || '';
    document.getElementById('clienteTelefonoForm').value = data.telefono || '';
    document.getElementById('clienteDireccion1Form').value = data.direccion_envio1 || '';
    document.getElementById('clienteDireccion2Form').value = data.direccion_envio2 || '';
    document.getElementById('clienteDireccion3Form').value = data.direccion_envio3 || '';
    document.getElementById('clienteNotaForm').value = data.nota || '';
    document.getElementById('clienteActivoForm').checked = !!data.activo;

    document.getElementById('clienteFormTitulo').textContent = 'Editar cliente';

    /*
    const btnToggle = document.getElementById('btnToggleEstadoCliente');
    btnToggle.classList.remove('hidden');
    btnToggle.textContent = data.activo
      ? 'Cambiar a inactivo'
      : 'Cambiar a activo';
    */
  
  mostrarFormularioCliente();
  
  } catch (error) {
    console.error('Error cargando cliente:', error);
    alert(error.message || 'No fue posible cargar el cliente.');
  }
}

async function guardarClienteGestion() {
  try {
    const data = obtenerDatosFormularioCliente();
    const errores = validarFormularioCliente(data);

    if (errores.length) {
      alert(errores.join('\n'));
      return;
    }

    if (data.id) {
      const { error } = await supabaseClient
        .from('clientes')
        .update({
          nombre: data.nombre,
          telefono: data.telefono || null,
          direccion_envio1: data.direccion_envio1 || null,
          direccion_envio2: data.direccion_envio2 || null,
          direccion_envio3: data.direccion_envio3 || null,
          nota: data.nota || null,
          activo: data.activo
        })
        .eq('id', data.id);

      if (error) {
        throw error;
      }

      alert('Cliente actualizado correctamente.');
    } else {
      const clienteCodigo = await generarCodigoCliente();

      const { error } = await supabaseClient
        .from('clientes')
        .insert([
          {
            cliente_codigo: clienteCodigo,
            nombre: data.nombre,
            telefono: data.telefono || null,
            direccion_envio1: data.direccion_envio1 || null,
            direccion_envio2: data.direccion_envio2 || null,
            direccion_envio3: data.direccion_envio3 || null,
            nota: data.nota || null,
            activo: true
          }
        ]);

      if (error) {
        throw error;
      }

      alert('Cliente creado correctamente.');
    }

    limpiarFormularioCliente();
    ocultarFormularioCliente();
    await buscarClientesGestion();
  } catch (error) {
    console.error('Error guardando cliente:', error);
    alert(error.message || 'Ocurrió un error al guardar el cliente.');
  }
}

/*
async function toggleEstadoCliente() {
  try {
    const clienteId = document.getElementById('clienteId').value.trim();

    if (!clienteId) {
      alert('Primero debes seleccionar un cliente.');
      return;
    }

    const activoActual = document.getElementById('clienteActivoForm').checked;
    const nuevoEstado = !activoActual;

    const mensaje = nuevoEstado
      ? '¿Deseas activar este cliente?'
      : '¿Deseas inactivar este cliente?';

    const ok = confirm(mensaje);
    if (!ok) return;

    const { error } = await supabaseClient
      .from('clientes')
      .update({
        activo: nuevoEstado
      })
      .eq('id', clienteId);

    if (error) {
      throw error;
    }

    document.getElementById('clienteActivoForm').checked = nuevoEstado;

    const btnToggle = document.getElementById('btnToggleEstadoCliente');
    btnToggle.textContent = nuevoEstado
      ? 'Cambiar a inactivo'
      : 'Cambiar a activo';

    alert(`Cliente ${nuevoEstado ? 'activado' : 'inactivado'} correctamente.`);
    await buscarClientesGestion();
  } catch (error) {
    console.error('Error cambiando estado del cliente:', error);
    alert(error.message || 'No fue posible cambiar el estado del cliente.');
  }
}
*/

function mostrarFormularioCliente() {
  document.getElementById('clienteFormPanel')?.classList.remove('hidden');
  document.getElementById('clienteFormPanel')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ocultarFormularioCliente() {
  document.getElementById('clienteFormPanel')?.classList.add('hidden');
}


/* GESTIÓN DE PRODUCTOS
========================= */

let productoImagenLocalGestion = '';
let productoEliminarImagenGestion = false;

function limpiarFormularioProducto() {
  document.getElementById('productoIdForm').value = '';
  document.getElementById('productoCodigoForm').value = '';
  document.getElementById('productoNombreForm').value = '';
  document.getElementById('productoOrigenForm').value = '';
  document.getElementById('productoActivoForm').checked = true;
  document.getElementById('productoImagenUrlForm').value = '';
  document.getElementById('productoImagenForm').value = '';

  productoImagenLocalGestion = '';
  productoEliminarImagenGestion = false;

  document.getElementById('productoFormTitulo').textContent = 'Nuevo producto';

  const nombreArchivo = document.getElementById('nombreArchivoProducto');
  if (nombreArchivo) {
    nombreArchivo.textContent = 'No se ha seleccionado imagen';
  }

  actualizarPreviewProductoGestion('');
}

function actualizarPreviewProductoGestion(src) {
  const wrap = document.getElementById('productoImagenPreviewWrap');
  const img = document.getElementById('productoImagenPreview');
  const empty = document.getElementById('productoImagenPreviewEmpty');
  const btnQuitar = document.getElementById('btnQuitarImagenProductoForm');

  const tieneImagen = Boolean(src);

  if (tieneImagen) {
    img.src = src;
    wrap.classList.remove('hidden');
    empty.classList.add('hidden');

    if (btnQuitar) {
      btnQuitar.classList.remove('hidden');
    }
  } else {
    img.src = '';
    wrap.classList.add('hidden');
    empty.classList.remove('hidden');

    if (btnQuitar) {
      btnQuitar.classList.add('hidden');
    }
  }
}

/*
function validarArchivoImagenProductoGestion(file) {
  return validarArchivoImagen(file);
}
*/

function manejarPreviewImagenProductoGestion() {
  const input = document.getElementById('productoImagenForm');
  const file = input.files?.[0];
  const nombreSpan = document.getElementById('nombreArchivoProducto');

  if (!file) {
    productoImagenLocalGestion = '';
    if (nombreSpan) {
      nombreSpan.textContent = 'No se ha seleccionado imagen';
    }
    return;
  }

  if (nombreSpan) {
    nombreSpan.textContent = file.name;
  }

  const validacion = validarArchivoImagen(file);

  if (!validacion.ok) {
    alert(validacion.mensaje);
    input.value = '';

    const imagenActual = document.getElementById('productoImagenUrlForm').value;
    productoImagenLocalGestion = '';

    if (nombreSpan) {
      nombreSpan.textContent = 'No se ha seleccionado imagen';
    }

    if (imagenActual && !productoEliminarImagenGestion) {
      actualizarPreviewProductoGestion(imagenActual);
    } else {
      actualizarPreviewProductoGestion('');
    }

    return;
  }

  const productoId = document.getElementById('productoIdForm').value.trim();
  const imagenActual = document.getElementById('productoImagenUrlForm').value.trim();

  if (productoId && imagenActual) {
    const ok = confirm(
      'Este producto ya tiene una imagen. La nueva imagen sustituirá la imagen anterior al guardar. ¿Deseas continuar?'
    );

    if (!ok) {
      input.value = '';
      if (nombreSpan) {
        nombreSpan.textContent = 'No se ha seleccionado imagen';
      }
      return;
    }
  }

  productoEliminarImagenGestion = false;

  const reader = new FileReader();
  reader.onload = e => {
    productoImagenLocalGestion = e.target?.result || '';
    actualizarPreviewProductoGestion(productoImagenLocalGestion);
  };
  reader.readAsDataURL(file);
}

function quitarImagenProductoGestion() {
  const productoId = document.getElementById('productoIdForm').value.trim();
  const imagenActual = document.getElementById('productoImagenUrlForm').value.trim();
  const tieneImagenLocal = Boolean(productoImagenLocalGestion);

  if (!imagenActual && !tieneImagenLocal) {
    return;
  }

  const mensaje = productoId && imagenActual
    ? 'La imagen del producto se eliminará al guardar los cambios. ¿Deseas continuar?'
    : 'La imagen seleccionada se quitará del formulario. ¿Deseas continuar?';

  const ok = confirm(mensaje);
  if (!ok) return;

  document.getElementById('productoImagenForm').value = '';
  productoImagenLocalGestion = '';
  productoEliminarImagenGestion = Boolean(productoId && imagenActual);

  const nombreArchivo = document.getElementById('nombreArchivoProducto');
  if (nombreArchivo) {
    nombreArchivo.textContent = 'No se ha seleccionado imagen';
  }

  actualizarPreviewProductoGestion('');
}

function obtenerDatosFormularioProducto() {
  return {
    id: document.getElementById('productoIdForm').value.trim(),
    producto_codigo: document.getElementById('productoCodigoForm').value.trim(),
    nombre: normalizarTexto(document.getElementById('productoNombreForm').value),
    origen_codigo: document.getElementById('productoOrigenForm').value,
    activo: document.getElementById('productoActivoForm').checked,
    imagen_url: document.getElementById('productoImagenUrlForm').value.trim()
  };
}

function validarFormularioProducto(data) {
  const errores = [];

  if (!data.nombre) {
    errores.push('Debes ingresar el nombre del producto.');
  }

  if (!data.origen_codigo) {
    errores.push('Debes seleccionar el origen del producto.');
  }

  return errores;
}

async function buscarProductosGestion() {
  try {
    const texto = normalizarTexto(
      document.getElementById('filtroProductoTexto').value
    );

    const origen = document.getElementById('filtroProductoOrigen').value;
    const estado = document.getElementById('filtroProductoEstado').value;

    let query = supabaseClient
      .from('productos')
      .select(`
        id,
        producto_codigo,
        nombre,
        imagen_url,
        activo,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (texto) {
      query = query.or(
        `producto_codigo.ilike.%${texto}%,nombre.ilike.%${texto}%`
      );
    }

    if (origen) {
      query = query.ilike('producto_codigo', `${origen}-%`);
    }

    if (estado === 'activos') {
      query = query.eq('activo', true);
    } else if (estado === 'inactivos') {
      query = query.eq('activo', false);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    renderTablaProductos(data || []);
  } catch (error) {
    console.error('Error buscando productos:', error);
    alert(error.message || 'Ocurrió un error al buscar productos.');
  }
}

function renderTablaProductos(productos) {
  const table = document.getElementById('tablaProductos');
  const body = document.getElementById('tablaProductosBody');
  const empty = document.getElementById('productosEmptyState');

  body.innerHTML = '';

  if (!productos.length) {
    table.classList.add('hidden');
    empty.textContent = 'No se encontraron productos con esos filtros.';
    return;
  }

  empty.textContent = '';
  table.classList.remove('hidden');

  productos.forEach(item => {
    const origen = String(item.producto_codigo || '').startsWith('CRO-')
      ? 'Crochet'
      : String(item.producto_codigo || '').startsWith('CRE-')
        ? 'Creaciones'
        : '';

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(item.producto_codigo || '')}</td>
      <td>
        ${
          item.imagen_url
            ? `<img src="${item.imagen_url}" alt="${escapeHtml(item.nombre || '')}" class="product-thumb">`
            : `<div class="product-thumb-empty">Sin<br>imagen</div>`
        }
      </td>
      <td>${escapeHtml(item.nombre || '')}</td>
      <td>${escapeHtml(origen)}</td>
      <td>${item.activo ? 'Activo' : 'Inactivo'}</td>
      <td>
        <button
          type="button"
          class="table-action-btn"
          data-producto-id="${item.id}"
        >
          Editar
        </button>
      </td>
    `;

    body.appendChild(tr);
  });

  body.querySelectorAll('.table-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cargarProductoEnFormulario(btn.dataset.productoId);
    });
  });
}

async function cargarProductoEnFormulario(productoId) {
  try {
    const { data, error } = await supabaseClient
      .from('productos')
      .select(`
        id,
        producto_codigo,
        nombre,
        imagen_url,
        activo
      `)
      .eq('id', productoId)
      .single();

    if (error) {
      throw error;
    }

    const origenCodigo = String(data.producto_codigo || '').startsWith('CRO-')
      ? 'CRO'
      : String(data.producto_codigo || '').startsWith('CRE-')
        ? 'CRE'
        : '';

    document.getElementById('productoIdForm').value = data.id || '';
    document.getElementById('productoCodigoForm').value = data.producto_codigo || '';
    document.getElementById('productoNombreForm').value = data.nombre || '';
    document.getElementById('productoOrigenForm').value = origenCodigo;
    document.getElementById('productoActivoForm').checked = !!data.activo;
    document.getElementById('productoImagenUrlForm').value = data.imagen_url || '';
    document.getElementById('productoImagenForm').value = '';

    productoImagenLocalGestion = '';
    productoEliminarImagenGestion = false;

    document.getElementById('productoFormTitulo').textContent = 'Editar producto';

    actualizarPreviewProductoGestion(data.imagen_url || '');
  } catch (error) {
    console.error('Error cargando producto:', error);
    alert(error.message || 'No fue posible cargar el producto.');
  }

  mostrarFormularioProducto();

}

async function guardarProductoGestion() {
  try {
    const data = obtenerDatosFormularioProducto();
    const errores = validarFormularioProducto(data);

    if (errores.length) {
      alert(errores.join('\n'));
      return;
    }

    const file = document.getElementById('productoImagenForm').files?.[0] || null;

    if (data.id) {
      let imagenFinal = data.imagen_url || null;

      if (productoEliminarImagenGestion && data.imagen_url) {
        await eliminarImagenStorage(data.imagen_url);
        imagenFinal = null;
      }

      if (file) {
        const validacion = validarArchivoImagen(file);
        if (!validacion.ok) {
          alert(validacion.mensaje);
          return;
        }

        const path = construirRutaImagenProducto(data.producto_codigo, file);
        imagenFinal = await subirImagenProductoStorage(file, path);
      }

      const { error } = await supabaseClient
        .from('productos')
        .update({
          nombre: data.nombre,
          imagen_url: imagenFinal,
          activo: data.activo
        })
        .eq('id', data.id);

      if (error) {
        throw error;
      }

      alert('Producto actualizado correctamente.');
    } else {
      const productoCodigo = await generarCodigoProducto(data.origen_codigo);

      let imagenFinal = null;

      if (file) {
        const validacion = validarArchivoImagen(file);
        if (!validacion.ok) {
          alert(validacion.mensaje);
          return;
        }

        const path = construirRutaImagenProducto(productoCodigo, file);
        imagenFinal = await subirImagenProductoStorage(file, path);
      }

      const { error } = await supabaseClient
        .from('productos')
        .insert([
          {
            producto_codigo: productoCodigo,
            nombre: data.nombre,
            imagen_url: imagenFinal,
            activo: true
          }
        ]);

      if (error) {
        throw error;
      }

      alert('Producto creado correctamente.');
    }

    limpiarFormularioProducto();
    ocultarFormularioProducto();
    await buscarProductosGestion();
  } catch (error) {
    console.error('Error guardando producto:', error);
    alert(error.message || 'Ocurrió un error al guardar el producto.');
  }
}

function mostrarFormularioProducto() {
  document.getElementById('productoFormPanel')?.classList.remove('hidden');
  document.getElementById('productoFormPanel')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ocultarFormularioProducto() {
  document.getElementById('productoFormPanel')?.classList.add('hidden');
}


/* SECCIÓN REPORTES
========================= */

function manejarCambioTipoReporte() {
  const tipo = document.getElementById('reporteTipo')?.value || 'ventas';
  const nivelWrap = document.getElementById('reporteNivelWrap');

  if (!nivelWrap) return;

  if (tipo === 'ventas') {
    nivelWrap.classList.remove('hidden');
  } else {
    nivelWrap.classList.add('hidden');
  }
}

function limpiarFiltrosReporte() {
  document.getElementById('reporteTipo').value = 'ventas';
  document.getElementById('reporteNivelVentas').value = 'resumen';
  document.getElementById('filtroReporteOrigen').value = '';
  document.getElementById('filtroReporteEstado').value = '';

  const inputMes = document.getElementById('filtroReporteMes');
  if (inputMes) {
    inputMes.value = obtenerMesActualReporte();
  }

  sincronizarFechasReporteDesdeMes();
  manejarCambioTipoReporte();
  limpiarVistaReporte();
}

function limpiarVistaReporte() {
  const tabla = document.getElementById('tablaReportes');
  const thead = document.getElementById('tablaReportesHead');
  const tbody = document.getElementById('tablaReportesBody');
  const empty = document.getElementById('reportesEmptyState');
  const resumenEmpty = document.getElementById('reportesResumenEmpty');
  const resumenCards = document.getElementById('reportesResumenCards');

  if (thead) thead.innerHTML = '';
  if (tbody) tbody.innerHTML = '';

  tabla?.classList.add('hidden');

  if (empty) {
    empty.textContent = 'Configura los filtros y pulsa “Generar reporte”.';
  }

  if (resumenEmpty) {
    resumenEmpty.textContent = 'Configura los filtros y pulsa “Generar reporte”.';
  }

  resumenCards?.classList.add('hidden');
}

async function buscarReporte() {
  const tipo = document.getElementById('reporteTipo')?.value || 'ventas';
  const nivelVentas = document.getElementById('reporteNivelVentas')?.value || 'resumen';

  if (tipo === 'ventas' && nivelVentas === 'resumen') {
    await buscarReporteVentasResumen();
    return;
  }

  if (tipo === 'ventas' && nivelVentas === 'detalle') {
    await buscarReporteVentasDetalle();
    return;
  }

  if (tipo === 'ganancias') {
    await buscarReporteGanancias();
    return;
  }

  alert('Este tipo de reporte aún no está implementado.');
}

async function buscarReporteVentasResumen() {
  try {
    const fechaDesde = document.getElementById('filtroReporteFechaDesde').value;
    const fechaHasta = document.getElementById('filtroReporteFechaHasta').value;
    const origen = document.getElementById('filtroReporteOrigen').value;
    const estado = document.getElementById('filtroReporteEstado').value;

    let query = supabaseClient
      .from('vw_facturas_resumen')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300);

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta);
    }

    if (origen) {
      query = query.eq('origen_codigo', origen);
    }

    if (estado) {
      query = query.eq('estado_codigo', estado);
    } else {
      query = query.in('estado_codigo', ['CSP', 'CAN']);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const filas = data || [];

    renderResumenReporteVentasResumen(filas);
    renderTablaReporteVentasResumen(filas);
  } catch (error) {
    console.error('Error buscando reporte de ventas resumen:', error);
    alert(error.message || 'Ocurrió un error al generar el reporte.');
  }
}

function renderResumenReporteVentasResumen(filas) {
  const resumenEmpty = document.getElementById('reportesResumenEmpty');
  const resumenCards = document.getElementById('reportesResumenCards');

  const label1 = document.getElementById('resumenLabel1');
  const label2 = document.getElementById('resumenLabel2');
  const label3 = document.getElementById('resumenLabel3');
  const label4 = document.getElementById('resumenLabel4');

  const valor1 = document.getElementById('resumenValor1');
  const valor2 = document.getElementById('resumenValor2');
  const valor3 = document.getElementById('resumenValor3');
  const valor4 = document.getElementById('resumenValor4');

  const nota = document.getElementById('reportesResumenNota');
  if (nota) {
    nota.classList.add('hidden');
    nota.textContent = '';
  }

  if (!filas.length) {
    resumenCards?.classList.add('hidden');

    if (resumenEmpty) {
      resumenEmpty.textContent = 'No hay datos para el resumen.';
    }
    return;
  }

  const totalVendido = filas.reduce((acc, item) => {
    return acc + Number(item.total_factura || 0);
  }, 0);

  const totalPagado = filas.reduce((acc, item) => {
    return acc + Number(item.pagado || 0);
  }, 0);

  const totalSaldo = filas.reduce((acc, item) => {
    return acc + Number(item.saldo_pendiente || 0);
  }, 0);

  const totalFacturas = filas.length;

  label1.textContent = 'Total vendido';
  label2.textContent = 'Total pagado';
  label3.textContent = 'Saldo pendiente';
  label4.textContent = 'Facturas';

  valor1.textContent = formatearMoneda(totalVendido);
  valor2.textContent = formatearMoneda(totalPagado);
  valor3.textContent = formatearMoneda(totalSaldo);
  valor4.textContent = String(totalFacturas);

  resumenEmpty.textContent = '';
  resumenCards?.classList.remove('hidden');
}

function renderTablaReporteVentasResumen(filas) {
  const tabla = document.getElementById('tablaReportes');
  const thead = document.getElementById('tablaReportesHead');
  const tbody = document.getElementById('tablaReportesBody');
  const empty = document.getElementById('reportesEmptyState');

  if (!tabla || !thead || !tbody || !empty) return;

  thead.innerHTML = `
    <tr>
      <th>Factura</th>
      <th>Fecha</th>
      <th>Cliente</th>
      <th>Origen</th>
      <th>Total</th>
      <th>Pagado</th>
      <th>Saldo</th>
      <th>Estado</th>
      <th>Costos</th>
      <th>Envío</th>
    </tr>
  `;

  tbody.innerHTML = '';

  if (!filas.length) {
    tabla.classList.add('hidden');
    empty.textContent = 'No se encontraron resultados con esos filtros.';
    return;
  }

  empty.textContent = '';
  tabla.classList.remove('hidden');

  filas.forEach(item => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(item.factura_codigo || '')}</td>
      <td>${escapeHtml(formatearFechaFactura(item.fecha || ''))}</td>
      <td>${escapeHtml(item.cliente_nombre || '')}</td>
      <td>${escapeHtml(item.origen_nombre || '')}</td>
      <td>${formatearMoneda(item.total_factura || 0)}</td>
      <td>${formatearMoneda(item.pagado || 0)}</td>
      <td>${formatearMoneda(item.saldo_pendiente || 0)}</td>
      <td class="${getClaseEstado(item.estado_codigo)}">
        ${escapeHtml(item.estado_nombre || '')}
      </td>
      <td class="status-icon-cell">
        ${renderIndicadorCostos(item.estado_costos)}
      </td>
      <td class="status-icon-cell">
        ${renderIndicadorEnvio(item.envio_registrado)}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function buscarReporteVentasDetalle() {
  try {
    const fechaDesde = document.getElementById('filtroReporteFechaDesde').value;
    const fechaHasta = document.getElementById('filtroReporteFechaHasta').value;
    const origen = document.getElementById('filtroReporteOrigen').value;
    const estado = document.getElementById('filtroReporteEstado').value;

    let query = supabaseClient
      .from('vw_detalle_factura_validacion')
      .select('*')
      .order('fecha', { ascending: false })
      .order('factura_codigo', { ascending: false })
      .limit(500);

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta);
    }

    if (origen) {
      query = query.eq('origen_codigo', origen);
    }

    if (estado) {
      query = query.eq('estado_codigo', estado);
    } else {
      query = query.in('estado_codigo', ['CSP', 'CAN']);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const filas = data || [];

    renderResumenReporteVentasDetalle(filas);
    renderTablaReporteVentasDetalle(filas);
  } catch (error) {
    console.error('Error buscando reporte de ventas detalle:', error);
    alert(error.message || 'Ocurrió un error al generar el reporte.');
  }
}

function renderResumenReporteVentasDetalle(filas) {
  const resumenEmpty = document.getElementById('reportesResumenEmpty');
  const resumenCards = document.getElementById('reportesResumenCards');

  const label1 = document.getElementById('resumenLabel1');
  const label2 = document.getElementById('resumenLabel2');
  const label3 = document.getElementById('resumenLabel3');
  const label4 = document.getElementById('resumenLabel4');

  const valor1 = document.getElementById('resumenValor1');
  const valor2 = document.getElementById('resumenValor2');
  const valor3 = document.getElementById('resumenValor3');
  const valor4 = document.getElementById('resumenValor4');

  if (!filas.length) {
    resumenCards?.classList.add('hidden');

    if (resumenEmpty) {
      resumenEmpty.textContent = 'No hay datos para el resumen.';
    }
    return;
  }

  const totalFacturado = filas.reduce((acc, item) => {
    return acc + Number(item.subtotal || 0);
  }, 0);

  const totalFacturas = new Set(
    filas.map(item => item.factura_id).filter(Boolean)
  ).size;

  const totalProductos = filas.length;

  const totalCantidadProductos = filas.reduce((acc, item) => {
    return acc + Number(item.cantidad || 0);
  }, 0);

  label1.textContent = 'Total facturado';
  label2.textContent = 'Total facturas';
  label3.textContent = 'Total productos';
  label4.textContent = 'Total cantidad de productos';

  valor1.textContent = formatearMoneda(totalFacturado);
  valor2.textContent = String(totalFacturas);
  valor3.textContent = String(totalProductos);
  valor4.textContent = String(totalCantidadProductos);

  resumenEmpty.textContent = '';
  resumenCards?.classList.remove('hidden');

  const nota = document.getElementById('reportesResumenNota');

  if (nota) {
    nota.textContent = 'Este reporte no considera el cobro por envío ni el descuento global, por lo que el valor del total facturado puede diferir del total de las facturas.';
    nota.classList.remove('hidden');
  }

}

function renderTablaReporteVentasDetalle(filas) {
  const tabla = document.getElementById('tablaReportes');
  const thead = document.getElementById('tablaReportesHead');
  const tbody = document.getElementById('tablaReportesBody');
  const empty = document.getElementById('reportesEmptyState');

  if (!tabla || !thead || !tbody || !empty) return;

  thead.innerHTML = `
    <tr>
      <th>Factura</th>
      <th>Fecha</th>
      <th>Cliente</th>
      <th>Origen</th>
      <th>Producto</th>
      <th>Cantidad</th>
      <th>P. Unit.</th>
      <th>Desc.</th>
      <th>Subtotal</th>
      <th>Estado</th>
    </tr>
  `;

  tbody.innerHTML = '';

  if (!filas.length) {
    tabla.classList.add('hidden');
    empty.textContent = 'No se encontraron resultados con esos filtros.';
    return;
  }

  empty.textContent = '';
  tabla.classList.remove('hidden');

  filas.forEach(item => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(item.factura_codigo || '')}</td>
      <td>${escapeHtml(formatearFechaFactura(item.fecha || ''))}</td>
      <td>${escapeHtml(item.cliente_nombre || '')}</td>
      <td>${escapeHtml(item.origen_nombre || '')}</td>
      <td>${escapeHtml(item.producto_nombre || '')}</td>
      <td>${escapeHtml(String(Number(item.cantidad || 0)))}</td>
      <td>${formatearMoneda(item.precio_unit || 0)}</td>
      <td>${formatearMoneda(item.desc_prod || 0)}</td>
      <td>${formatearMoneda(item.subtotal || 0)}</td>
      <td class="${getClaseEstado(item.estado_codigo)}">
        ${escapeHtml(item.estado_nombre || '')}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function buscarReporteGanancias() {
  try {
    const fechaDesde = document.getElementById('filtroReporteFechaDesde').value;
    const fechaHasta = document.getElementById('filtroReporteFechaHasta').value;
    const origen = document.getElementById('filtroReporteOrigen').value;
    const estado = document.getElementById('filtroReporteEstado').value;

    let query = supabaseClient
      .from('vw_ganancia_factura')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300);

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta);
    }

    if (origen) {
      query = query.eq('origen_codigo', origen);
    }

    if (estado) {
      query = query.eq('estado_codigo', estado);
    } else {
      query = query.in('estado_codigo', ['CSP', 'CAN']);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const filas = data || [];

    renderResumenReporteGanancias(filas);
    renderTablaReporteGanancias(filas);
  } catch (error) {
    console.error('Error buscando reporte de ganancias:', error);
    alert(error.message || 'Ocurrió un error al generar el reporte.');
  }
}

function renderResumenReporteGanancias(filas) {
  const resumenEmpty = document.getElementById('reportesResumenEmpty');
  const resumenCards = document.getElementById('reportesResumenCards');

  const label1 = document.getElementById('resumenLabel1');
  const label2 = document.getElementById('resumenLabel2');
  const label3 = document.getElementById('resumenLabel3');
  const label4 = document.getElementById('resumenLabel4');

  const valor1 = document.getElementById('resumenValor1');
  const valor2 = document.getElementById('resumenValor2');
  const valor3 = document.getElementById('resumenValor3');
  const valor4 = document.getElementById('resumenValor4');

  const nota = document.getElementById('reportesResumenNota');
  if (nota) {
    nota.classList.add('hidden');
    nota.textContent = '';
  }

  if (!filas.length) {
    resumenCards?.classList.add('hidden');

    if (resumenEmpty) {
      resumenEmpty.textContent = 'No hay datos para el resumen.';
    }
    return;
  }

  const totalVendido = filas.reduce((acc, item) => {
    return acc + Number(item.total_factura || 0);
  }, 0);

  const totalCosto = filas.reduce((acc, item) => {
    return acc + Number(item.costo_total_negocio || 0);
  }, 0);

  const totalGanancia = filas.reduce((acc, item) => {
    return acc + Number(item.ganancia_bruta || 0);
  }, 0);

  const margenGlobal = totalVendido > 0
    ? (totalGanancia / totalVendido) * 100
    : 0;

  label1.textContent = 'Total vendido';
  label2.textContent = 'Costo total';
  label3.textContent = 'Ganancia bruta';
  label4.textContent = 'Margen global';

  valor1.textContent = formatearMoneda(totalVendido);
  valor2.textContent = formatearMoneda(totalCosto);
  valor3.textContent = formatearMoneda(totalGanancia);
  valor4.textContent = `${formatearMontoFactura(margenGlobal)} %`;

  resumenEmpty.textContent = '';
  resumenCards?.classList.remove('hidden');
}

function renderTablaReporteGanancias(filas) {
  const tabla = document.getElementById('tablaReportes');
  const thead = document.getElementById('tablaReportesHead');
  const tbody = document.getElementById('tablaReportesBody');
  const empty = document.getElementById('reportesEmptyState');

  if (!tabla || !thead || !tbody || !empty) return;

  thead.innerHTML = `
    <tr>
      <th>Factura</th>
      <th>Fecha</th>
      <th>Cliente</th>
      <th>Origen</th>
      <th>Total venta</th>
      <th>Costo productos</th>
      <th>Costo envío</th>
      <th>Costo total</th>
      <th>Ganancia</th>
      <th>Margen</th>
      <th>Estado</th>
      <th>Costos</th>
    </tr>
  `;

  tbody.innerHTML = '';

  if (!filas.length) {
    tabla.classList.add('hidden');
    empty.textContent = 'No se encontraron resultados con esos filtros.';
    return;
  }

  empty.textContent = '';
  tabla.classList.remove('hidden');

  filas.forEach(item => {
    const margen = Number(item.margen_bruto_pct || 0) * 100;

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(item.factura_codigo || '')}</td>
      <td>${escapeHtml(formatearFechaFactura(item.fecha || ''))}</td>
      <td>${escapeHtml(item.cliente_nombre || '')}</td>
      <td>${escapeHtml(item.origen_nombre || '')}</td>
      <td>${formatearMoneda(item.total_factura || 0)}</td>
      <td>${formatearMoneda(item.total_costo_productos || 0)}</td>
      <td>${formatearMoneda(item.costo_envio || 0)}</td>
      <td>${formatearMoneda(item.costo_total_negocio || 0)}</td>
      <td>${formatearMoneda(item.ganancia_bruta || 0)}</td>
      <td>${formatearMontoFactura(margen)} %</td>
      <td class="${getClaseEstado(item.estado_codigo)}">
        ${escapeHtml(item.estado_nombre || '')}
      </td>
      <td class="status-icon-cell">
        ${renderIndicadorCostos(item.estado_costos)}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function obtenerMesActualReporte() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function obtenerPrimerDiaMes(periodoMes) {
  if (!periodoMes || !periodoMes.includes('-')) {
    return '';
  }

  return `${periodoMes}-01`;
}

function obtenerUltimoDiaMes(periodoMes) {
  if (!periodoMes || !periodoMes.includes('-')) {
    return '';
  }

  const [year, month] = periodoMes.split('-').map(Number);
  const ultimoDia = new Date(year, month, 0);
  const day = String(ultimoDia.getDate()).padStart(2, '0');

  return `${periodoMes}-${day}`;
}

function sincronizarFechasReporteDesdeMes() {
  const mes = document.getElementById('filtroReporteMes')?.value || '';
  const inputDesde = document.getElementById('filtroReporteFechaDesde');
  const inputHasta = document.getElementById('filtroReporteFechaHasta');

  if (!mes || !inputDesde || !inputHasta) {
    return;
  }

  inputDesde.value = obtenerPrimerDiaMes(mes);
  inputHasta.value = obtenerUltimoDiaMes(mes);
}

function inicializarFiltrosReporte() {
  const inputMes = document.getElementById('filtroReporteMes');

  if (!inputMes) return;

  inputMes.value = obtenerMesActualReporte();
  sincronizarFechasReporteDesdeMes();
}


/* SECCIÓN FLUJOS
========================= */

function inicializarVistaFlujos() {
  const fecha = document.getElementById('flujoFecha');
  const inputMes = document.getElementById('filtroFlujoMes');
  const fondo = document.getElementById('filtroFlujoFondo');

  if (fecha && !fecha.value) {
    fecha.value = obtenerFechaHoy();
  }

  if (inputMes && !inputMes.value) {
    inputMes.value = obtenerMesActualFlujo();
  }

  sincronizarFechasFlujoDesdeMes();

  if (fondo && !fondo.value) {
    fondo.value = '';
  }
}

function limpiarFormularioFlujo() {
  document.getElementById('flujoFecha').value = obtenerFechaHoy();
  document.getElementById('flujoTipo').value = '';
  document.getElementById('flujoMonto').value = '';
  document.getElementById('flujoObservacion').value = '';
}

async function buscarFlujos() {
  try {
    const fechaDesde = document.getElementById('filtroFlujoFechaDesde').value;
    const fechaHasta = document.getElementById('filtroFlujoFechaHasta').value;
    const fondo = document.getElementById('filtroFlujoFondo').value;

    if (!fechaDesde || !fechaHasta) {
      alert('Debes indicar Fecha desde y Fecha hasta.');
      return;
    }

    const { data: resumen, error: errorResumen } = await supabaseClient
      .from('vw_resumen_flujos_caja')
      .select('*')
      .single();

    if (errorResumen) {
      throw errorResumen;
    }

    const fechaInicialCorte = restarUnDia(fechaDesde);

    let querySaldoInicial = supabaseClient
      .from('vw_flujo_movimientos')
      .select('*')
      .lt('fecha', fechaDesde)
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: true });

    let queryMovimientos = supabaseClient
      .from('vw_flujo_movimientos')
      .select('*')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: true });

    let queryManuales = supabaseClient
      .from('vw_detalle_flujos_caja')
      .select('*')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: true });

    if (fondo) {
      querySaldoInicial = querySaldoInicial.eq('fondo', fondo);
      queryMovimientos = queryMovimientos.eq('fondo', fondo);

      const fondoManual = fondo === 'DUENA' ? 'Dueña' : 'Negocio';
      queryManuales = queryManuales.eq('fondo_afectado', fondoManual);
    }

    const [
      { data: movimientosPrevios, error: errorPrevios },
      { data: movimientosPeriodo, error: errorPeriodo },
      { data: movimientosManuales, error: errorManuales }
    ] = await Promise.all([
      querySaldoInicial,
      queryMovimientos,
      queryManuales
    ]);

    if (errorPrevios) throw errorPrevios;
    if (errorPeriodo) throw errorPeriodo;
    if (errorManuales) throw errorManuales;

    renderResumenFlujosFiltrado(
      resumen || {},
      movimientosPrevios || [],
      movimientosPeriodo || [],
      fondo
    );

    renderTablaFlujosConSaldo(
      movimientosPrevios || [],
      movimientosPeriodo || [],
      movimientosManuales || [],
      fechaInicialCorte
    );
  } catch (error) {
    console.error('Error buscando flujos:', error);
    alert(error.message || 'Ocurrió un error al consultar los flujos.');
  }
}

function renderResumenFlujosFiltrado(resumen, movimientosPrevios, movimientosPeriodo, fondo) {
  const todos = [...movimientosPrevios, ...movimientosPeriodo];

  const saldoFiltrado = todos.reduce((acc, item) => {
    return acc + Number(item.monto_signed || 0);
  }, 0);

  if (fondo === 'DUENA') {
    const moRetirada = todos
      .filter(item => item.tipo_movimiento === 'MO' && item.naturaleza === 'EGRESO')
      .reduce((acc, item) => acc + Number(item.monto || 0), 0);

    document.getElementById('flujoSaldoDuena').textContent =
      formatearMoneda(saldoFiltrado);

    document.getElementById('flujoSaldoNegocio').textContent =
      formatearMoneda(0);

    document.getElementById('flujoSaldoTotal').textContent =
      formatearMoneda(saldoFiltrado);

    return;
  }

  if (fondo === 'NEGOCIO') {
    document.getElementById('flujoSaldoDuena').textContent =
      formatearMoneda(0);

    document.getElementById('flujoSaldoNegocio').textContent =
      formatearMoneda(saldoFiltrado);

    document.getElementById('flujoSaldoTotal').textContent =
      formatearMoneda(saldoFiltrado);

    return;
  }

  document.getElementById('flujoSaldoDuena').textContent =
    formatearMoneda(resumen.saldo_duena || 0);

  document.getElementById('flujoSaldoNegocio').textContent =
    formatearMoneda(resumen.saldo_negocio || 0);

  document.getElementById('flujoSaldoTotal').textContent =
    formatearMoneda(resumen.saldo_total_caja || 0);
}

function renderTablaFlujosConSaldo(
  movimientosPrevios,
  movimientosPeriodo,
  movimientosManuales,
  fechaSaldoInicial
) {
  const tabla = document.getElementById('tablaFlujos');
  const body = document.getElementById('tablaFlujosBody');
  const empty = document.getElementById('flujosEmptyState');

  body.innerHTML = '';

  const saldoInicial = movimientosPrevios.reduce((acc, item) => {
    return acc + Number(item.monto_signed || 0);
  }, 0);

  let saldoAcumulado = saldoInicial;

  const manualesMap = new Map();
  (movimientosManuales || []).forEach(item => {
    manualesMap.set(String(item.id), item);
  });

  const filasRender = [];

  filasRender.push({
    esSaldoInicial: true,
    fecha: fechaSaldoInicial,
    fondo: 'GENERAL',
    naturaleza: 'SALDO',
    monto: saldoInicial,
    saldo: saldoInicial,
    tipo_nombre: 'Saldo inicial',
    factura_codigo: '',
    observacion: 'Saldo acumulado antes del período consultado',
    movimiento_retiro_id: null,
    activo: true
  });

  movimientosPeriodo.forEach(item => {
    saldoAcumulado += Number(item.monto_signed || 0);

    let activo = true;
    let estadoNombre = '';

    if (item.movimiento_retiro_id) {
      const manual = manualesMap.get(String(item.movimiento_retiro_id));
      if (manual) {
        activo = Boolean(manual.activo);
        estadoNombre = manual.estado_nombre || '';
      }
    }

    filasRender.push({
      ...item,
      saldo: saldoAcumulado,
      activo,
      estado_nombre: estadoNombre
    });
  });

  // agregar manuales anulados que no aparecen en vw_flujo_movimientos
  (movimientosManuales || []).forEach(item => {
    if (item.activo) return;

    filasRender.push({
      fecha: item.fecha,
      fondo: item.fondo_afectado === 'Dueña' ? 'DUENA' : 'NEGOCIO',
      naturaleza: 'EGRESO',
      monto: item.monto,
      saldo: null,
      tipo_nombre: item.tipo_nombre,
      factura_codigo: '',
      observacion: item.observacion || '',
      movimiento_retiro_id: item.id,
      activo: false,
      estado_nombre: item.estado_nombre || 'Anulado',
      esAnuladoSinImpacto: true
    });
  });

  filasRender.sort((a, b) => {
    const fechaA = a.fecha || '';
    const fechaB = b.fecha || '';

    if (fechaA !== fechaB) {
      return fechaA.localeCompare(fechaB);
    }

    const createdA = a.created_at || '';
    const createdB = b.created_at || '';
    return createdA.localeCompare(createdB);
  });

  if (!filasRender.length) {
    tabla.classList.add('hidden');
    empty.textContent = 'No hay movimientos para mostrar.';
    return;
  }

  empty.textContent = '';
  tabla.classList.remove('hidden');

  filasRender.forEach(item => {
    const tr = document.createElement('tr');

    const esIngreso = item.naturaleza === 'INGRESO';
    const esEgreso = item.naturaleza === 'EGRESO';
    const esSaldoInicial = item.esSaldoInicial === true;
    const esEditable = Boolean(item.movimiento_retiro_id);
    const estaActivo = item.activo !== false;

    const claseMonto = esIngreso
      ? 'flujo-ingreso'
      : esEgreso
        ? 'flujo-egreso'
        : 'flujo-saldo';

    let accionesHtml = '—';

    if (esEditable) {
      const botonEditar = estaActivo
        ? `
          <button
            type="button"
            class="table-action-btn btn-editar-flujo"
            data-movimiento-id="${item.movimiento_retiro_id}"
          >
            Editar
          </button>
        `
        : '';

      const botonEstado = estaActivo
        ? `
          <button
            type="button"
            class="table-action-btn btn-anular-flujo"
            data-movimiento-id="${item.movimiento_retiro_id}"
          >
            Anular
          </button>
        `
        : `
          <button
            type="button"
            class="table-action-btn btn-activar-flujo"
            data-movimiento-id="${item.movimiento_retiro_id}"
          >
            Activar
          </button>
        `;

      accionesHtml = `
        <div class="flujo-actions">
          ${botonEditar}
          ${botonEstado}
        </div>
      `;
    }

    tr.innerHTML = `
      <td>${escapeHtml(formatearFechaFactura(item.fecha || ''))}</td>
      <td>${escapeHtml(item.fondo || '')}</td>
      <td>${escapeHtml(item.naturaleza || '')}</td>
      <td class="monto-cell ${claseMonto}">
        ${formatearMontoFactura(item.monto || 0)}
      </td>
      <td class="saldo-cell flujo-saldo">
        ${item.saldo === null ? '—' : formatearMontoFactura(item.saldo)}
      </td>
      <td>${accionesHtml}</td>
      <td>${escapeHtml(item.tipo_nombre || '')}</td>
      <td>${escapeHtml(item.factura_codigo || '')}</td>
      <td>
        ${escapeHtml(item.observacion || '')}
        ${item.estado_nombre ? `<div class="helper-text">${escapeHtml(item.estado_nombre)}</div>` : ''}
      </td>
    `;

    if (esSaldoInicial) {
      tr.classList.add('row-saldo-inicial');
    }

    if (!estaActivo && !esSaldoInicial) {
      tr.classList.add('row-anulada');
    }

    body.appendChild(tr);
  });

  body.querySelectorAll('.btn-editar-flujo').forEach(btn => {
    btn.addEventListener('click', () => {
      cargarMovimientoFlujoEnFormulario(btn.dataset.movimientoId);
    });
  });

  body.querySelectorAll('.btn-anular-flujo').forEach(btn => {
    btn.addEventListener('click', () => {
      cambiarEstadoMovimientoFlujo(btn.dataset.movimientoId, false);
    });
  });

  body.querySelectorAll('.btn-activar-flujo').forEach(btn => {
    btn.addEventListener('click', () => {
      cambiarEstadoMovimientoFlujo(btn.dataset.movimientoId, true);
    });
  });
}

async function guardarMovimientoFlujo() {
  try {
    const idEdicion = document.getElementById('flujoIdEdicion').value.trim();
    const fecha = document.getElementById('flujoFecha').value;
    const tipo = document.getElementById('flujoTipo').value;
    const monto = redondear2(
      parseFloat(document.getElementById('flujoMonto').value || '0')
    );
    const observacion = normalizarTexto(
      document.getElementById('flujoObservacion').value
    );

    const errores = [];

    if (!fecha) {
      errores.push('Debes indicar la fecha del movimiento.');
    }

    if (!tipo) {
      errores.push('Debes seleccionar el tipo de movimiento.');
    }

    if (monto <= 0) {
      errores.push('El monto debe ser mayor que cero.');
    }

    if (errores.length) {
      alert(errores.join('\n'));
      return;
    }

    const btn = document.getElementById('btnGuardarFlujo');
    btn.disabled = true;
    btn.textContent = idEdicion ? 'Guardando cambios...' : 'Guardando...';

    if (idEdicion) {
      const { error } = await supabaseClient
        .from('movimientos_retiro')
        .update({
          fecha,
          tipo_movimiento: tipo,
          monto,
          observacion: observacion || null
        })
        .eq('id', idEdicion);

      if (error) {
        throw error;
      }

      alert('Movimiento actualizado correctamente.');
    } else {
      const { error } = await supabaseClient
        .from('movimientos_retiro')
        .insert([
          {
            fecha,
            tipo_movimiento: tipo,
            monto,
            observacion: observacion || null,
            activo: true
          }
        ]);

      if (error) {
        throw error;
      }

      alert('Movimiento guardado correctamente.');
    }

    cancelarEdicionFlujo();
    await buscarFlujos();
  } catch (error) {
    console.error('Error guardando movimiento de flujo:', error);
    alert(error.message || 'No fue posible guardar el movimiento.');
  } finally {
    const btn = document.getElementById('btnGuardarFlujo');
    if (btn) {
      btn.disabled = false;
      btn.textContent = document.getElementById('flujoIdEdicion').value.trim()
        ? 'Guardar cambios'
        : 'Guardar';
    }
  }
}

function obtenerMesActualFlujo() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function obtenerPrimerDiaMesFlujo(periodoMes) {
  if (!periodoMes || !periodoMes.includes('-')) {
    return '';
  }

  return `${periodoMes}-01`;
}

function obtenerUltimoDiaMesFlujo(periodoMes) {
  if (!periodoMes || !periodoMes.includes('-')) {
    return '';
  }

  const [year, month] = periodoMes.split('-').map(Number);
  const ultimoDia = new Date(year, month, 0);
  const day = String(ultimoDia.getDate()).padStart(2, '0');

  return `${periodoMes}-${day}`;
}

function sincronizarFechasFlujoDesdeMes() {
  const mes = document.getElementById('filtroFlujoMes')?.value || '';
  const inputDesde = document.getElementById('filtroFlujoFechaDesde');
  const inputHasta = document.getElementById('filtroFlujoFechaHasta');

  if (!mes || !inputDesde || !inputHasta) {
    return;
  }

  inputDesde.value = obtenerPrimerDiaMesFlujo(mes);
  inputHasta.value = obtenerUltimoDiaMesFlujo(mes);
}

function toggleFormularioFlujo() {
  const panel = document.getElementById('flujoFormPanel');
  const btn = document.getElementById('btnToggleFormularioFlujo');

  if (!panel || !btn) return;

  const estaOculto = panel.classList.contains('hidden');

  if (estaOculto) {
    panel.classList.remove('hidden');
    btn.textContent = '− Ocultar';
  } else {
    panel.classList.add('hidden');
    btn.textContent = '+ Nuevo';
    cancelarEdicionFlujo();
  }
}

function abrirFormularioFlujo() {
  const panel = document.getElementById('flujoFormPanel');
  const btn = document.getElementById('btnToggleFormularioFlujo');

  if (panel) {
    panel.classList.remove('hidden');
  }

  if (btn) {
    btn.textContent = '− Ocultar';
  }
}

function cerrarFormularioFlujo() {
  const panel = document.getElementById('flujoFormPanel');
  const btn = document.getElementById('btnToggleFormularioFlujo');

  if (panel) {
    panel.classList.add('hidden');
  }

  if (btn) {
    btn.textContent = '+ Nuevo';
  }
}

function cancelarEdicionFlujo() {
  document.getElementById('flujoIdEdicion').value = '';
  document.getElementById('btnGuardarFlujo').textContent = 'Guardar';
  document.getElementById('btnCancelarEdicionFlujo').classList.add('hidden');
  limpiarFormularioFlujo();
}

async function cargarMovimientoFlujoEnFormulario(movimientoId) {
  try {
    const { data, error } = await supabaseClient
      .from('movimientos_retiro')
      .select('id, fecha, tipo_movimiento, monto, observacion, activo')
      .eq('id', movimientoId)
      .single();

    if (error) {
      throw error;
    }

    document.getElementById('flujoIdEdicion').value = data.id || '';
    document.getElementById('flujoFecha').value = data.fecha || '';
    document.getElementById('flujoTipo').value = data.tipo_movimiento || '';
    document.getElementById('flujoMonto').value = Number(data.monto || 0);
    document.getElementById('flujoObservacion').value = data.observacion || '';

    document.getElementById('btnGuardarFlujo').textContent = 'Guardar cambios';
    document.getElementById('btnCancelarEdicionFlujo').classList.remove('hidden');

    abrirFormularioFlujo();

    document.getElementById('flujoFormPanel')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('Error cargando movimiento para edición:', error);
    alert(error.message || 'No fue posible cargar el movimiento.');
  }
}

async function inactivarMovimientoFlujo(movimientoId) {
  try {
    const confirmado = confirm(
      '¿Deseas anular este movimiento? Dejará de afectar los saldos.'
    );

    if (!confirmado) return;

    const { error } = await supabaseClient
      .from('movimientos_retiro')
      .update({
        activo: false
      })
      .eq('id', movimientoId);

    if (error) {
      throw error;
    }

    alert('Movimiento anulado correctamente.');
    await buscarFlujos();
  } catch (error) {
    console.error('Error anulando movimiento:', error);
    alert(error.message || 'No fue posible anular el movimiento.');
  }
}

async function cambiarEstadoMovimientoFlujo(movimientoId, activar) {
  try {
    const mensaje = activar
      ? '¿Deseas activar nuevamente este movimiento?'
      : '¿Deseas anular este movimiento? Dejará de afectar los saldos.';

    const confirmado = confirm(mensaje);
    if (!confirmado) return;

    const { error } = await supabaseClient
      .from('movimientos_retiro')
      .update({
        activo: activar
      })
      .eq('id', movimientoId);

    if (error) {
      throw error;
    }

    alert(`Movimiento ${activar ? 'activado' : 'anulado'} correctamente.`);
    await buscarFlujos();
  } catch (error) {
    console.error('Error cambiando estado del movimiento:', error);
    alert(error.message || 'No fue posible cambiar el estado del movimiento.');
  }
}


/* SECCIÓN GRÁFICOS
========================= */



/* UTILIDADES
========================= */

function formatearMoneda(valor) {
  return `C$ ${Number(valor || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatearFechaFactura(fechaIso) {
  if (!fechaIso || !fechaIso.includes('-')) {
    return fechaIso || '';
  }

  const [year, month, day] = fechaIso.split('-');
  return `${day}/${month}/${year}`;
}

function formatearMontoFactura(valor) {
  return Number(valor || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function esErrorDuplicado(error) {
  if (!error) return false;

  return error.code === '23505'
    || String(error.message || '').toLowerCase().includes('duplicate')
    || String(error.details || '').toLowerCase().includes('already exists');
}

async function listarCodigosPorPrefijo(tabla, columna, prefijo) {
  const codigos = [];
  let from = 0;
  const chunkSize = 1000;

  while (true) {
    const { data, error } = await supabaseClient
      .from(tabla)
      .select(columna)
      .ilike(columna, `${prefijo}%`)
      .range(from, from + chunkSize - 1);

    if (error) {
      throw error;
    }

    const batch = (data || [])
      .map(item => item[columna])
      .filter(Boolean);

    codigos.push(...batch);

    if (!data || data.length < chunkSize) {
      break;
    }

    from += chunkSize;
  }

  return codigos;
}

function obtenerMaximoConRegex(codigos, regex) {
  let maximo = 0;

  codigos.forEach(codigo => {
    const match = String(codigo).match(regex);
    if (!match) return;

    const numero = Number(match[1]);
    if (Number.isFinite(numero) && numero > maximo) {
      maximo = numero;
    }
  });

  return maximo;
}

function formatearCodigo(prefijo, numero, digitos) {
  return `${prefijo}${String(numero).padStart(digitos, '0')}`;
}

async function obtenerSiguienteConsecutivo({
  tabla,
  columna,
  prefijo,
  regex
}) {
  const codigos = await listarCodigosPorPrefijo(tabla, columna, prefijo);
  const maximo = obtenerMaximoConRegex(codigos, regex);
  return maximo + 1;
}

function limpiarInputImagenProducto(row) {
  const fileInput = row.querySelector('.producto-imagen-file');
  if (fileInput) {
    fileInput.value = '';
  }
}

function validarArchivoImagen(file) {
  if (!file) {
    return {
      ok: false,
      mensaje: 'No se seleccionó ningún archivo.'
    };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      ok: false,
      mensaje: 'Formato no permitido. Usa JPG, JPEG, PNG o WEBP.'
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      mensaje: 'La imagen seleccionada supera el límite de 1 MB. Reduce su tamaño antes de guardarla.'
    };
  }

  return {
    ok: true,
    mensaje: ''
  };
}

function actualizarBotonPrincipalTopbar() {
  const btn = document.getElementById('btnLogout');
  if (!btn) return;

  const homeActiva = document
    .getElementById('homeView')
    ?.classList.contains('active-section');

  // Limpia solo la clase de inicio (no tocamos la de salir)
  btn.classList.remove('btn-home');

  if (homeActiva) {
    btn.textContent = 'Salir';
  } else {
    btn.textContent = '🏠 Inicio';
    btn.classList.add('btn-home');
  }
}

function restarUnDia(fechaIso) {
  const fecha = new Date(`${fechaIso}T00:00:00`);
  fecha.setDate(fecha.getDate() - 1);

  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}