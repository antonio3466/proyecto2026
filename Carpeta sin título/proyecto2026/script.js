const rol = localStorage.getItem("rol");
const idAlumno = localStorage.getItem("id_alumno") ? Number(localStorage.getItem("id_alumno")) : null;
const idDocente = localStorage.getItem("id_docente") ? Number(localStorage.getItem("id_docente")) : null;
const idPreceptor = localStorage.getItem("id_preceptor") ? Number(localStorage.getItem("id_preceptor")) : null;

let registros = [];
let registroSeleccionado = null;

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

    tabla.innerHTML += `
      <tr>
        <td>${registro.nombre}</td>
        <td>${registro.apellido}</td>
        <td>${registro.materia}</td>
        <td>${registro.asistencia}</td>
        <td>${registro.nota}</td>
        <td>${botonSeleccion}</td>
      </tr>
    `;
  });
}

function seleccionarRegistro(id_alumno, id_materia, nombre, apellido, materia) {
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

function logout() {
  localStorage.removeItem("rol");
  localStorage.removeItem("id_usuario");
  localStorage.removeItem("id_alumno");
  localStorage.removeItem("id_docente");
  localStorage.removeItem("id_preceptor");
  window.location.href = "login.html";
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

  const fecha = new Date().toISOString().split("T")[0];

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
    alert("Error al registrar la asistencia.");
    return;
  }

  alert("Asistencia registrada correctamente.");
  registroSeleccionado = null;
  const info = document.getElementById("seleccionInfo");
  if (info) {
    info.textContent = "Selecciona un alumno y una materia para registrar asistencia.";
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
  const fechaActa = new Date().toISOString().split("T")[0];

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
    info.textContent = "Selecciona un alumno y una materia para registrar asistencia.";
  }
  cargarRegistros();
}

