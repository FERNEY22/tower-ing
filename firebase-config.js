// Inicializar Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB...tu_api_key...", // Reemplaza con tu API Key real
  authDomain: "tower-ing.firebaseapp.com",
  databaseURL: "https://tower-ing-default-rtdb.firebaseio.com",
  projectId: "tower-ing",
  storageBucket: "tower-ing.appspot.com",
  messagingSenderId: "123456789012", // Reemplaza con tu ID real
  appId: "1:123456789012:web:abcdef123456" // Reemplaza con tu App ID real
};

firebase.initializeApp(firebaseConfig);

// Obtener referencias a los servicios
const auth = firebase.auth();
const database = firebase.database();

// Función para mostrar/ocultar formularios
function showLoginForm() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('login-tab').classList.add('active');
  document.getElementById('register-tab').classList.remove('active');
}

function showRegisterForm() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
  document.getElementById('login-tab').classList.remove('active');
  document.getElementById('register-tab').classList.add('active');
}

// Función para registrar un usuario
function registerUser(email, password) {
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("Usuario registrado:", userCredential.user);
      // Redirigir a la página de cuestionarios o dashboard
      window.location.href = "estudiante.html";
    })
    .catch((error) => {
      const messageElement = document.getElementById('auth-message');
      messageElement.textContent = error.message;
    });
}

// Función para iniciar sesión
function loginUser(email, password) {
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("Usuario autenticado:", userCredential.user);
      // Redirigir a la página de cuestionarios o dashboard
      window.location.href = "estudiante.html";
    })
    .catch((error) => {
      const messageElement = document.getElementById('auth-message');
      messageElement.textContent = error.message;
    });
}

// Event listeners para los botones de pestañas
document.getElementById('login-tab').addEventListener('click', showLoginForm);
document.getElementById('register-tab').addEventListener('click', showRegisterForm);

// Event listener para el formulario de login
document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault(); // Evitar que el formulario se envíe normalmente
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  loginUser(email, password);
});

// Event listener para el formulario de registro
document.getElementById('register-form').addEventListener('submit', function(e) {
  e.preventDefault(); // Evitar que el formulario se envíe normalmente
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;

  if (password !== confirmPassword) {
    document.getElementById('auth-message').textContent = "Las contraseñas no coinciden.";
    return;
  }

  registerUser(email, password);
});

// Mostrar el formulario de autenticación cuando la página cargue
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auth-form').style.display = 'block';
});