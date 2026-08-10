const supabaseUrl = "https://hvzkgwymqgdahcvqgoud.supabase.co";

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2emtnd3ltcWdkYWhjdnFnb3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTEyMjksImV4cCI6MjA5Njc4NzIyOX0.pwfO-RS9zvzHQZFNWKjm5fS0I7_svvgg7NHA9TntK3U";

const clienteSupabase = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);

async function login() {
  const usuario = document.getElementById("usuario").value;
  const clave = document.getElementById("clave").value;

  const { data, error } = await clienteSupabase
    .from("usuario")
    .select("id_usuario, gmail, contrasena, rol, id_alumno, id_docente, id_preceptor")
    .eq("gmail", usuario)
    .eq("contrasena", clave)
    .maybeSingle();

  if (error) {
    console.error(error);
    alert("Error de conexión");
    return;
  }

  if (data) {
    localStorage.setItem("rol", data.rol);
    localStorage.setItem("id_usuario", data.id_usuario);
    localStorage.removeItem("id_alumno");
    localStorage.removeItem("id_docente");
    localStorage.removeItem("id_preceptor");

    if (data.id_alumno) {
      localStorage.setItem("id_alumno", data.id_alumno);
    }
    if (data.id_docente) {
      localStorage.setItem("id_docente", data.id_docente);
    }
    if (data.id_preceptor) {
      localStorage.setItem("id_preceptor", data.id_preceptor);
    }

    window.location.href = "index.html";
  } else {
    alert("Usuario o contraseña incorrectos");
  }
}

function togglePassword() {
  const input = document.getElementById("clave");
  input.type = input.type === "password" ? "text" : "password";
}