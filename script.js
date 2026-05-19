let rol = localStorage.getItem("rol");


if(!rol){

  window.location.href = "login.html";

}


if(rol === "docente"){

  
  document.getElementById("panelAsistencia").style.display = "none";

}


if(rol === "preceptor"){

  
  document.getElementById("panelNota").style.display = "none";

}


if(rol === "alumno"){

  
  document.getElementById("panelAsistencia").style.display = "none";

  
  document.getElementById("panelNota").style.display = "none";

}


function logout(){

  localStorage.removeItem("rol");

  window.location.href = "login.html";

}



function buscarAlumno(){

  alert("Buscar alumno");

}


function sumarFalta(){

  alert("Asistencia registrada");

}


function agregarNota(){

  alert("Nota agregada");

}