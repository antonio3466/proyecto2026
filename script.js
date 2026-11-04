const rol = localStorage.getItem("rol");
const idAlumno = localStorage.getItem("id_alumno") ? Number(localStorage.getItem("id_alumno")) : null;
const idDocente = localStorage.getItem("id_docente") ? Number(localStorage.getItem("id_docente")) : null;
const idPreceptor = localStorage.getItem("id_preceptor") ? Number(localStorage.getItem("id_preceptor")) : null;

let registros = [];
let registroSeleccionado = null;
let notaEnEdicion = null;

window.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  if (!rol) {
    window.location.href = "login.html";
    return;
  }

  const panelBuscar = document.getElementById("panelBuscar");
  const panelAsistencia = document.getElementById("panelAsistencia");
  const panelNota = document.getElementById("panelNota");

  if (rol === "docente") {
    panelAsistencia.style.display = "none";
  }

  if (rol === "preceptor") {
    panelNota.style.display = "none";
  }

  if (rol === "alumno") {
    panelBuscar.style.display = "none";
    panelAsistencia.style.display = "none";
    panelNota.style.display = "none";
    document.getElementById("panelAcciones").style.display = "none";
  }

  cargarRegistros();
}

async function cargarRegistros() {
  const resultado = await obtenerRegistros();

  if (resultado.error) {
    console.error(resultado.error);
    alert("No fue posible cargar los datos. Intenta nuevamente.");
    return;
  }

  registros = resultado.data;
  renderTabla(registros);
}

function escapeTexto(texto) {
  return String(texto || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function fechaLocalHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function renderTabla(registros) {
  const tabla = document.getElementById("tabla");

  tabla.innerHTML = `
    <tr>
      <th>Nombre</th>
      <th>Apellido</th>
      <th>Materia</th>
      <th>Registro de Asistencias</th>
      <th>Nota</th>
      <th>Acción</th>
    </tr>
  `;

  if (!registros.length) {
    tabla.innerHTML += `
      <tr>
        <td colspan="6" style="text-align: center; padding: 16px;">No se encontraron registros.</td>
      </tr>
    `;
    return;
  }

  registros.forEach(registro => {
    const puedeSeleccionar = registro.id_materia !== null && (rol === "admin" || rol === "docente" || rol === "preceptor");
    const botonSeleccion = puedeSeleccionar
      ? `<button class="secondary" onclick="seleccionarRegistro(${registro.id_alumno}, ${registro.id_materia}, '${escapeTexto(registro.nombre)}', '${escapeTexto(registro.apellido)}', '${escapeTexto(registro.materia)}')">Seleccionar</button>`
      : "";

    const puedeEditarNota = registro.id_nota !== null && registro.id_nota !== undefined && (rol === "admin" || rol === "docente");
    const botonEditar = puedeEditarNota
      ? `<button class="secondary" onclick="editarNota(${registro.id_alumno}, ${registro.id_materia})">Editar nota</button>`
      : "";

    tabla.innerHTML += `
      <tr>
        <td>${registro.nombre}</td>
        <td>${registro.apellido}</td>
        <td>${registro.materia}</td>
        <td>${registro.asistencia}</td>
        <td>${registro.nota}</td>
        <td>${botonSeleccion} ${botonEditar}</td>
      </tr>
    `;
  });
}

function seleccionarRegistro(id_alumno, id_materia, nombre, apellido, materia) {
  if (notaEnEdicion !== null) cancelarEdicionNota();

  registroSeleccionado = {
    id_alumno,
    id_materia,
    nombre,
    apellido,
    materia
  };

  const info = document.getElementById("seleccionInfo");
  if (info) {
    info.textContent = `Seleccionado: ${nombre} ${apellido} - ${materia}`;
  }
}

function buscarAlumno() {
  if (rol === "alumno") {
    return;
  }

  const texto = document.getElementById("buscar").value.toLowerCase();
  const encontrados = registros.filter(registro =>
    `${registro.nombre} ${registro.apellido}`.toLowerCase().includes(texto)
  );

  renderTabla(encontrados);
}

async function sumarFalta(presente) {
  if (!(rol === "admin" || rol === "preceptor")) {
    alert("No tienes permiso para registrar asistencias.");
    return;
  }

  if (!registroSeleccionado) {
    alert("Selecciona primero un alumno y una materia.");
    return;
  }

  const fecha = fechaLocalHoy();

  const { error } = await clienteSupabase.from("asistencia").insert([
    {
      fecha,
      presente,
      id_alumno: registroSeleccionado.id_alumno,
      id_materia: registroSeleccionado.id_materia
    }
  ]);

  if (error) {
    console.error(error);
    if (error.code === "23505") {
      alert("Ya hay una asistencia registrada hoy para ese alumno y materia.");
    } else {
      alert("Error al registrar la asistencia.");
    }
    return;
  }

  alert("Asistencia registrada correctamente.");
  registroSeleccionado = null;
  const info = document.getElementById("seleccionInfo");
  if (info) {
    info.textContent = "Selecciona un alumno y una materia.";
  }
  cargarRegistros();
}

async function agregarNota() {
  if (!(rol === "admin" || rol === "docente")) {
    alert("No tienes permiso para agregar notas.");
    return;
  }

  if (!registroSeleccionado) {
    alert("Selecciona primero un alumno y una materia.");
    return;
  }

  const valorNota = parseFloat(document.getElementById("nota").value);

  if (Number.isNaN(valorNota)) {
    alert("Ingrese un valor de nota válido.");
    return;
  }

  const { data: examenes, error: errorExamen } = await clienteSupabase
    .from("examen")
    .select("id_examen")
    .eq("id_materia", registroSeleccionado.id_materia)
    .order("fecha", { ascending: false })
    .limit(1);

  if (errorExamen) {
    console.error(errorExamen);
    alert("Error al buscar un examen para esa materia.");
    return;
  }

  if (!examenes || !examenes.length) {
    alert("No existe un examen registrado para esta materia.");
    return;
  }

  const examen = examenes[0];
  const fechaActa = fechaLocalHoy();

  const { error } = await clienteSupabase.from("nota").insert([
    {
      puntaje: valorNota,
      id_alumno: registroSeleccionado.id_alumno,
      id_examen: examen.id_examen,
      fecha_acta: fechaActa
    }
  ]);

  if (error) {
    console.error(error);
    alert("Error al registrar la nota.");
    return;
  }

  alert("Nota agregada correctamente.");
  document.getElementById("nota").value = "";
  registroSeleccionado = null;
  const info = document.getElementById("seleccionInfo");
  if (info) {
    info.textContent = "Selecciona un alumno y una materia.";
  }
  cargarRegistros();
}

function editarNota(id_alumno, id_materia) {
  if (!(rol === "admin" || rol === "docente")) {
    alert("No tienes permiso para editar notas.");
    return;
  }

  const registro = registros.find(r => r.id_alumno === id_alumno && r.id_materia === id_materia);
  if (!registro || registro.id_nota === null || registro.id_nota === undefined) {
    alert("Ese alumno no tiene una nota para editar en esta materia.");
    return;
  }

  registroSeleccionado = {
    id_alumno,
    id_materia,
    nombre: registro.nombre,
    apellido: registro.apellido,
    materia: registro.materia
  };
  notaEnEdicion = registro.id_nota;

  const info = document.getElementById("notaInfo");
  info.textContent = `Editando nota de: ${registro.nombre} ${registro.apellido} - ${registro.materia}`;
  info.style.display = "block";

  document.getElementById("nota").value = registro.nota;
  document.getElementById("btnNota").style.display = "none";
  document.getElementById("btnGuardarEdicion").style.display = "";
  document.getElementById("btnCancelarEdicion").style.display = "";
  document.getElementById("nota").focus();
}

async function guardarEdicionNota() {
  if (!(rol === "admin" || rol === "docente")) {
    alert("No tienes permiso para editar notas.");
    return;
  }

  if (notaEnEdicion === null) {
    alert("Primero elegí una nota para editar.");
    return;
  }

  const nuevoValor = parseFloat(document.getElementById("nota").value);

  if (Number.isNaN(nuevoValor) || nuevoValor < 0 || nuevoValor > 10) {
    alert("Ingresá una nota válida entre 0 y 10.");
    return;
  }

  const { data, error } = await clienteSupabase
    .from("nota")
    .update({ puntaje: nuevoValor })
    .eq("id_nota", notaEnEdicion)
    .select();

  if (error) {
    console.error(error);
    alert("Error al guardar el cambio.");
    return;
  }

  if (!data || !data.length) {
    alert("No se encontró la nota para modificar.");
    return;
  }

  alert("Nota modificada correctamente.");
  cancelarEdicionNota();
  cargarRegistros();
}

function cancelarEdicionNota() {
  notaEnEdicion = null;
  registroSeleccionado = null;
  document.getElementById("nota").value = "";
  document.getElementById("notaInfo").style.display = "none";
  document.getElementById("btnNota").style.display = "";
  document.getElementById("btnGuardarEdicion").style.display = "none";
  document.getElementById("btnCancelarEdicion").style.display = "none";
}