function calcularPromedio(notas) {
  if (!notas || !notas.length) return null;
  const suma = notas.reduce((acc, n) => acc + n.puntaje, 0);
  return Math.round((suma / notas.length) * 10) / 10;
}

function calcularAsistencia(asistencias) {
  if (!asistencias || !asistencias.length) return { presentes: 0, total: 0, porcentaje: null };
  const total = asistencias.length;
  const presentes = asistencias.filter(a => a.presente).length;
  return { presentes, total, porcentaje: Math.round((presentes / total) * 100) };
}

function construirFilaReporte(alumno, idMateria, nombreMateria, notasMateria, asistenciasMateria) {
  const promedio = calcularPromedio(notasMateria);
  const { presentes, total, porcentaje } = calcularAsistencia(asistenciasMateria);

  return {
    id_alumno: alumno.id_alumno,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    materia: nombreMateria,
    promedio: promedio !== null ? promedio : "-",
    asistencia: total > 0 ? `${presentes}/${total} (${porcentaje}%)` : "Sin registros"
  };
}

function armarReportesDesdeAlumnos(alumnos) {
  const reportes = [];
  alumnos.forEach(alumno => {
    if (!alumno.inscripcion || !alumno.inscripcion.length) {
      reportes.push(construirFilaReporte(alumno, null, "Sin materia", [], []));
      return;
    }
    alumno.inscripcion.forEach(inscripcion => {
      const idMateria = inscripcion.id_materia;
      const notasMateria = (alumno.nota || []).filter(n => n.examen?.id_materia === idMateria);
      const asistenciasMateria = (alumno.asistencia || []).filter(a => a.id_materia === idMateria);
      reportes.push(construirFilaReporte(alumno, idMateria, inscripcion.materia?.nombre || "Sin materia", notasMateria, asistenciasMateria));
    });
  });
  return reportes;
}

async function obtenerReportes() {
  const usuario = obtenerUsuarioActual();
  if (!usuario.rol) return { data: [], error: null };

  const selectCompleto = `id_alumno,nombre,apellido,id_curso,inscripcion(id_materia,materia(id_materia,nombre)),nota(id_nota,puntaje,examen(id_examen,id_materia)),asistencia(id_asistencia,presente,id_materia)`;

  if (usuario.rol === "admin" || usuario.rol === "alumno") {
    let query = clienteSupabase.from("alumno").select(selectCompleto);
    if (usuario.rol === "alumno") {
      query = query.eq("id_alumno", usuario.id_alumno);
    }

    const { data, error } = await query;
    if (error) return { data: [], error };

    return { data: armarReportesDesdeAlumnos(data), error: null };
  }

  if (usuario.rol === "preceptor") {
    const { data: cursos, error: errorCursos } = await clienteSupabase
      .from("curso").select("id_curso").eq("id_preceptor", usuario.id_preceptor);
    if (errorCursos) return { data: [], error: errorCursos };

    const cursoIds = cursos?.map(c => c.id_curso).filter(Boolean) || [];
    if (!cursoIds.length) return { data: [], error: null };

    const { data, error } = await clienteSupabase
      .from("alumno").select(selectCompleto).in("id_curso", cursoIds);
    if (error) return { data: [], error };

    return { data: armarReportesDesdeAlumnos(data), error: null };
  }

  if (usuario.rol === "docente") {
    const { data: materias, error: errorMaterias } = await clienteSupabase
      .from("materia").select("id_materia,nombre").eq("id_docente", usuario.id_docente);
    if (errorMaterias) return { data: [], error: errorMaterias };

    const materiaIds = materias?.map(m => m.id_materia) || [];
    if (!materiaIds.length) return { data: [], error: null };

    const { data: inscripciones, error: errorInscripciones } = await clienteSupabase
      .from("inscripcion")
      .select("id_alumno,id_materia,alumno(id_alumno,nombre,apellido)")
      .in("id_materia", materiaIds);
    if (errorInscripciones) return { data: [], error: errorInscripciones };

    const alumnoIds = Array.from(new Set(inscripciones.map(i => i.id_alumno)));

    const { data: notas, error: errorNotas } = await clienteSupabase
      .from("nota").select("id_nota,puntaje,id_alumno,examen(id_examen,id_materia)")
      .in("id_alumno", alumnoIds);
    if (errorNotas) return { data: [], error: errorNotas };

    const { data: asistencias, error: errorAsistencias } = await clienteSupabase
      .from("asistencia").select("id_asistencia,presente,id_alumno,id_materia")
      .in("id_alumno", alumnoIds).in("id_materia", materiaIds);
    if (errorAsistencias) return { data: [], error: errorAsistencias };

    const reportes = inscripciones.map(inscripcion => {
      const idMateria = inscripcion.id_materia;
      const nombreMateria = materias.find(m => m.id_materia === idMateria)?.nombre || "Sin materia";
      const notasMateria = notas.filter(n => n.id_alumno === inscripcion.id_alumno && n.examen?.id_materia === idMateria);
      const asistenciasMateria = asistencias.filter(a => a.id_alumno === inscripcion.id_alumno && a.id_materia === idMateria);
      return construirFilaReporte(inscripcion.alumno, idMateria, nombreMateria, notasMateria, asistenciasMateria);
    });

    return { data: reportes, error: null };
  }

  return { data: [], error: null };
}

async function obtenerAusentesPorFecha(fecha) {
  const usuario = obtenerUsuarioActual();
  if (!usuario.rol) return { data: [], error: null };

  let alumnoIds = null;

  if (usuario.rol === "preceptor") {
    const { data: cursos, error: errorCursos } = await clienteSupabase
      .from("curso").select("id_curso").eq("id_preceptor", usuario.id_preceptor);
    if (errorCursos) return { data: [], error: errorCursos };
    const cursoIds = cursos?.map(c => c.id_curso) || [];
    const { data: alumnos, error: errorAlumnos } = await clienteSupabase
      .from("alumno").select("id_alumno").in("id_curso", cursoIds);
    if (errorAlumnos) return { data: [], error: errorAlumnos };
    alumnoIds = alumnos.map(a => a.id_alumno);
  }

  if (usuario.rol === "docente") {
    const { data: materias } = await clienteSupabase
      .from("materia").select("id_materia").eq("id_docente", usuario.id_docente);
    const materiaIds = materias?.map(m => m.id_materia) || [];
    const { data: inscripciones } = await clienteSupabase
      .from("inscripcion").select("id_alumno").in("id_materia", materiaIds);
    alumnoIds = Array.from(new Set((inscripciones || []).map(i => i.id_alumno)));
  }

  if (usuario.rol === "alumno") {
    alumnoIds = [usuario.id_alumno];
  }

  let query = clienteSupabase
    .from("asistencia")
    .select("id_alumno,fecha,presente,id_materia,alumno(nombre,apellido),materia(nombre)")
    .eq("fecha", fecha)
    .eq("presente", false);

  if (alumnoIds) {
    query = query.in("id_alumno", alumnoIds);
  }

  const { data, error } = await query;
  if (error) return { data: [], error };

  const resultado = data.map(a => ({
    nombre: a.alumno?.nombre,
    apellido: a.alumno?.apellido,
    materia: a.materia?.nombre || "Sin materia"
  }));

  return { data: resultado, error: null };
}

function filtrarAprobacion(reportes, filtro, notaMinima = 6) {
  if (filtro === "todos") return reportes;
  return reportes.filter(r => {
    if (r.promedio === "-") return filtro === "sin_nota";
    return filtro === "aprobados" ? r.promedio >= notaMinima : r.promedio < notaMinima;
  });
}