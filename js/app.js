let supabaseClient = null;

let selectedCliente = null;
let productoRowCounter = 0;
let pagoRowCounter = 0;

const ventaCatalogos = {
  estadoActivaId: null,
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
          categoria_producto_id: null,
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
    ventaCatalogos.estadoActivaId &&
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
      .eq('codigo', 'ACT')
      .single(),
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
  const estadoFacturaId = ventaCatalogos.estadoActivaId;

  if (!origenFacturaId) {
    throw new Error(`No se encontró el origen ${data.origenCodigo}.`);
  }

  if (!estadoFacturaId) {
    throw new Error('No se encontró el estado ACT de factura.');
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
        tipo_pago_id: null,
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
      <td>${escapeHtml(item.estado_nombre || '')}</td>
      <td>
        <div class="table-actions-wrap">
          <button
            type="button"
            class="table-action-btn btn-ver-factura"
            data-factura-id="${item.id}"
          >
            Ver / Reimprimir
          </button>

          <button
            type="button"
            class="table-action-btn btn-costos-factura"
            data-factura-id="${item.id}"
          >
            Cargar costos
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

  body.querySelectorAll('.btn-costos-factura').forEach(btn => {
    btn.addEventListener('click', () => {
      abrirPanelCostosFactura(btn.dataset.facturaId);
    });
  });
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
      desc_global,
      total_factura,
      pagado,
      observaciones,
      clientes (
        id,
        nombre
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

/* CARGA DE COSTOS POR FACTURA-PRODUCTO
==================== */

let facturaCostosActual = null;

async function abrirPanelCostosFactura(facturaId) {
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

  const btnToggle = document.getElementById('btnToggleEstadoCliente');
  btnToggle.classList.add('hidden');
  btnToggle.textContent = 'Cambiar a inactivo';
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

    const btnToggle = document.getElementById('btnToggleEstadoCliente');
    btnToggle.classList.remove('hidden');
    btnToggle.textContent = data.activo
      ? 'Cambiar a inactivo'
      : 'Cambiar a activo';
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
            categoria_producto_id: null,
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
    await buscarProductosGestion();
  } catch (error) {
    console.error('Error guardando producto:', error);
    alert(error.message || 'Ocurrió un error al guardar el producto.');
  }
}


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
