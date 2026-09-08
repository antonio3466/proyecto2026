const supabaseUrl = "https://hvzkgwymqgdahcvqgoud.supabase.co";

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2emtnd3ltcWdkYWhjdnFnb3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTEyMjksImV4cCI6MjA5Njc4NzIyOX0.pwfO-RS9zvzHQZFNWKjm5fS0I7_svvgg7NHA9TntK3U";

const clienteSupabase = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);

function obtenerUsuarioActual() {
  return {
    rol: localStorage.getItem("rol"),
    id_alumno: localStorage.getItem("id_alumno") ? Number(localStorage.getItem("id_alumno")) : null,
    id_docente: localStorage.getItem("id_docente") ? Number(localStorage.getItem("id_docente")) : null,
    id_preceptor: localStorage.getItem("id_preceptor") ? Number(localStorage.getItem("id_preceptor")) : null
  };
}

function obtenerNotaMasReciente(notas, idAlumno, idMateria) {
  if (!notas) return null;

  const notasFiltradas = notas.filter(nota => {
    const notaAlumno = nota.id_alumno === idAlumno;
    const materiaExamen = nota.examen?.id_materia === idMateria;
    return notaAlumno && materiaExamen;
  });

  if (!notasFiltradas.length) return null;

  notasFiltradas.sort((a, b) => {
    const fechaA = new Date(a.fecha_acta || a.examen?.fecha || "").getTime();
    const fechaB = new Date(b.fecha_acta || b.examen?.fecha || "").getTime();
    return fechaB - fechaA;
  });

  return notasFiltradas[0];
}

function obtenerAsistenciaMasReciente(asistencias, idAlumno, idMateria) {
  if (!asistencias) return null;

  const asistenciasFiltradas = asistencias.filter(asistencia => {
    return asistencia.id_alumno === idAlumno && asistencia.id_materia === idMateria;
  });

  if (!asistenciasFiltradas.length) return null;

  asistenciasFiltradas.sort((a, b) => {
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
  });

  return asistenciasFiltradas[0];
}

function construirFilaAlumno(alumno, inscripcion, notaReciente, asistenciaReciente) {
  return {
    id_alumno: alumno.id_alumno,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    id_materia: inscripcion?.id_materia || null,
    materia: inscripcion?.materia?.nombre || "Sin materia",
    nota: notaReciente ? notaReciente.puntaje : "-",
    asistencia: asistenciaReciente ? (asistenciaReciente.presente ? "Presente" : "Ausente") : "Sin registro"
  };
}

function construirFilaMateria(materia, inscripcion, notaReciente, asistenciaReciente) {
  return {
    id_alumno: inscripcion.id_alumno,
    nombre: inscripcion.alumno.nombre,
    apellido: inscripcion.alumno.apellido,
    id_materia: materia.id_materia,
    materia: materia.nombre,
    nota: notaReciente ? notaReciente.puntaje : "-",
    asistencia: asistenciaReciente ? (asistenciaReciente.presente ? "Presente" : "Ausente") : "Sin registro"
  };
}

async function obtenerRegistros() {
  const usuario = obtenerUsuarioActual();

  if (!usuario.rol) {
    return { data: [], error: null };
  }

  if (usuario.rol === "admin" || usuario.rol === "alumno") {
    let query = clienteSupabase.from("alumno").select(
      `id_alumno,nombre,apellido,id_curso,curso(id_preceptor),inscripcion(id_materia,materia(id_materia,nombre)),nota(id_nota,puntaje,fecha_acta,examen(id_examen,id_materia)),asistencia(id_asistencia,fecha,presente,id_materia,materia(id_materia,nombre))`
    );

    if (usuario.rol === "alumno") {
      query = query.eq("id_alumno", usuario.id_alumno);
    }

    const { data, error } = await query;
    if (error) return { data: [], error };

    const registros = [];
    data.forEach(alumno => {
      if (alumno.inscripcion && alumno.inscripcion.length) {
        alumno.inscripcion.forEach(inscripcion => {
          const notaReciente = obtenerNotaMasReciente(alumno.nota, alumno.id_alumno, inscripcion.id_materia);
          const asistenciaReciente = obtenerAsistenciaMasReciente(alumno.asistencia, alumno.id_alumno, inscripcion.id_materia);
          registros.push(construirFilaAlumno(alumno, inscripcion, notaReciente, asistenciaReciente));
        });
      } else {
        registros.push(construirFilaAlumno(alumno, null, null, null));
      }
    });

    return { data: registros, error: null };
  }

  if (usuario.rol === "preceptor") {
    const { data: cursos, error: errorCursos } = await clienteSupabase
      .from("curso")
      .select("id_curso")
      .eq("id_preceptor", usuario.id_preceptor);

    if (errorCursos) return { data: [], error: errorCursos };

    const cursoIds = cursos?.map(c => c.id_curso).filter(Boolean) || [];
    if (!cursoIds.length) return { data: [], error: null };

    const { data, error } = await clienteSupabase
      .from("alumno")
      .select(
        `id_alumno,nombre,apellido,id_curso,inscripcion(id_materia,materia(id_materia,nombre)),nota(id_nota,puntaje,fecha_acta,examen(id_examen,id_materia)),asistencia(id_asistencia,fecha,presente,id_materia,materia(id_materia,nombre))`
      )
      .in("id_curso", cursoIds);

    if (error) return { data: [], error };

    const registros = [];
    data.forEach(alumno => {
      if (alumno.inscripcion && alumno.inscripcion.length) {
        alumno.inscripcion.forEach(inscripcion => {
          const notaReciente = obtenerNotaMasReciente(alumno.nota, alumno.id_alumno, inscripcion.id_materia);
          const asistenciaReciente = obtenerAsistenciaMasReciente(alumno.asistencia, alumno.id_alumno, inscripcion.id_materia);
          registros.push(construirFilaAlumno(alumno, inscripcion, notaReciente, asistenciaReciente));
        });
      } else {
        registros.push(construirFilaAlumno(alumno, null, null, null));
      }
    });

    return { data: registros, error: null };
  }

  if (usuario.rol === "docente") {
    const { data: materias, error: errorMaterias } = await clienteSupabase
      .from("materia")
      .select("id_materia")
      .eq("id_docente", usuario.id_docente);

    if (errorMaterias) return { data: [], error: errorMaterias };

    const materiaIds = materias?.map(m => m.id_materia).filter(Boolean) || [];
    if (!materiaIds.length) return { data: [], error: null };

    const { data: inscripciones, error: errorInscripciones } = await clienteSupabase.from("inscripcion").select(
      `id_alumno,id_materia,alumno(id_alumno,nombre,apellido),materia(id_materia,nombre)`
    ).in("id_materia", materiaIds);

    if (errorInscripciones) return { data: [], error: errorInscripciones };

    const alumnoIds = Array.from(new Set(inscripciones.map(inscripcion => inscripcion.id_alumno).filter(Boolean)));
    const { data: notas, error: errorNotas } = await clienteSupabase.from("nota").select(
      `id_nota,puntaje,id_alumno,id_examen,examen(id_examen,id_materia)`
    ).in("id_alumno", alumnoIds);

    if (errorNotas) return { data: [], error: errorNotas };

    const { data: asistencias, error: errorAsistencias } = await clienteSupabase.from("asistencia").select(
      `id_asistencia,fecha,presente,id_alumno,id_materia`
    ).in("id_alumno", alumnoIds).in("id_materia", materiaIds);

    if (errorAsistencias) return { data: [], error: errorAsistencias };

    const registros = inscripciones.map(inscripcion => {
      const idMateria = inscripcion.id_materia;
      const idAlumnoInscripcion = inscripcion.id_alumno;
      const notaReciente = obtenerNotaMasReciente(notas, idAlumnoInscripcion, idMateria);
      const asistenciaReciente = obtenerAsistenciaMasReciente(asistencias, idAlumnoInscripcion, idMateria);

      return {
        id_alumno: inscripcion.alumno.id_alumno,
        nombre: inscripcion.alumno.nombre,
        apellido: inscripcion.alumno.apellido,
        id_materia: idMateria,
        materia: inscripcion.materia?.nombre || "Sin materia",
        nota: notaReciente ? notaReciente.puntaje : "-",
        asistencia: asistenciaReciente ? (asistenciaReciente.presente ? "Presente" : "Ausente") : "Sin registro"
      };
    });

    return { data: registros, error: null };
  }

  return { data: [], error: null };
}