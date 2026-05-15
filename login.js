const usuarios = [

  {
    usuario: "admin",
    clave: "1234",
    rol: "admin"
  },

  {
    usuario: "docente",
    clave: "1111",
    rol: "docente"
  },

  {
    usuario: "preceptor",
    clave: "2222",
    rol: "preceptor"
  },

  {
    usuario: "alumno",
    clave: "3333",
    rol: "alumno"
  }

];

function login() {

  let usuario = document.getElementById("usuario").value;
  let clave = document.getElementById("clave").value;

  let encontrado = usuarios.find(u =>
    u.usuario === usuario && u.clave === clave
  );

  if(encontrado){

    localStorage.setItem("rol", encontrado.rol);

    window.location.href = "index.html";

  } else {

    alert("Usuario o contraseña incorrectos");

  }
}