const alumnos = [
  {
    nombre: "Antonio",
    apellido: "Vera",
    materia: "Matematica",
    asistencia: "Presente",
    nota: 8.5
  },
  {
    nombre: "Maria",
    apellido: "Gomez",
    materia: "Historia",
    asistencia: "Ausente",
    nota: 7
  }
];

function buscarAlumno() {

  let texto = document
    .getElementById("buscar")
    .value
    .toLowerCase();

  let tabla = document.getElementById("tabla");

  tabla.innerHTML = `
    <tr>
      <th>Nombre</th>
      <th>Apellido</th>
      <th>Materia</th>
      <th>Registro de Asistencias</th>
      <th>Nota</th>
    </tr>
  `;

  let encontrados = alumnos.filter(alumno =>
    (alumno.nombre + " " + alumno.apellido)
      .toLowerCase()
      .includes(texto)
  );

  encontrados.forEach(alumno => {
    tabla.innerHTML += `
      <tr>
        <td>${alumno.nombre}</td>
        <td>${alumno.apellido}</td>
        <td>${alumno.materia}</td>
        <td>${alumno.asistencia}</td>
        <td>${alumno.nota}</td>
      </tr>
    `;
  });
} 
 

