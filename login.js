const supabaseUrl = "https://hvzkgwymqgdahcvqgoud.supabase.co";

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2emtnd3ltcWdkYWhjdnFnb3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTEyMjksImV4cCI6MjA5Njc4NzIyOX0.pwfO-RS9zvzHQZFNWKjm5fS0I7_svvgg7NHA9TntK3U";

const clienteSupabase = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);

async function login() {

let usuario = document.getElementById("usuario").value;
let clave = document.getElementById("clave").value;

const { data, error } = await clienteSupabase
.from("usuario")
.select("*")
.eq("gmail", usuario)
.eq("contrasena", clave);

console.log("DATA:", data);
console.log("ERROR:", error);

if (error) {
console.error(error);
alert("Error de conexión");
return;
}

if (data.length > 0) {

localStorage.setItem("rol", "admin");

window.location.href = "index.html";

} else {

alert("Usuario o contraseña incorrectos");

}
}

function togglePassword() {
  const input = document.getElementById("clave");
  input.type = input.type === "password" ? "text" : "password";
}