// Inicializar Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCXThSlDXwOZPSqcGSi2lMNF20bXAk1tfU",
  authDomain: "tower-ing.firebaseapp.com",
  databaseURL: "https://tower-ing-default-rtdb.firebaseio.com",
  projectId: "tower-ing",
  storageBucket: "tower-ing.firebasestorage.app",
  messagingSenderId: "440636238988",
  appId: "1:440636238988:web:58291c1d59c98f695b1fa9"
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
function registerUser(name, lastname, cedula, date, email, password) {
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("Usuario registrado:", userCredential.user);
      // Guardar los datos adicionales del usuario en Realtime Database
      const userId = userCredential.user.uid;
      const userData = {
        name: name,
        lastname: lastname,
        cedula: cedula,
        date: date,
        email: email,
        createdAt: new Date().toISOString()
      };

      database.ref('users/' + userId).set(userData)
        .then(() => {
          console.log("Datos del usuario guardados en la base de datos.");
            // Mostrar mensaje de éxito y redirigir después de un breve momento
            document.getElementById('auth-message').textContent = "¡Usuario registrado exitosamente! Redirigiendo...";
            document.getElementById('auth-message').style.color = "green"; // Opcional: Cambia el color a verde para éxito
            // Opcional: Si no quieres redirigir inmediatamente, puedes usar un timeout
            // setTimeout(() => {
            //   window.location.href = "estudiante.html";
            // }, 2000); // Redirige después de 2 segundos
            //window.location.href = "estudiante.html";

            // Mostrar mensaje de bienvenida en la primera sección
            document.querySelector('main section').innerHTML = '<h2>¡Bienvenido, ' + name + '! Has iniciado sesión correctamente.</h2><p>Ahora puedes explorar el sitio.</p>';
            // Opcional: Ocultar el formulario de autenticación
            document.getElementById('auth-form').style.display = 'none';


        })
        .catch((error) => {
          console.error("Error al guardar los datos del usuario:", error);
          document.getElementById('auth-message').textContent = "Error al guardar tus datos. Por favor, inténtalo de nuevo.";
        });
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

      // Obtener el nombre del usuario desde la base de datos para el mensaje
      const userId = userCredential.user.uid;
      database.ref('users/' + userId).once('value')
        .then((snapshot) => {
          const userData = snapshot.val();
          const displayName = userData ? userData.name : userCredential.user.email;

          // Mostrar mensaje de bienvenida en la primera sección
          document.querySelector('main section').innerHTML = `<h2>¡Bienvenido de nuevo, ${displayName}! Has iniciado sesión correctamente.</h2><p>Ahora puedes explorar el sitio.</p>`;
          // Ocultar el formulario de autenticación
          document.getElementById('auth-form').style.display = 'none';

          // Opcional: Mostrar el cuadro de usuario autenticado en el header
          const userInfoDiv = document.getElementById('user-info');
          if (userInfoDiv) {
            userInfoDiv.style.display = 'block';
            document.getElementById('user-name').textContent = displayName;
          }

        })
        .catch((error) => {
          // Si hay error al obtener nombre, usar UID o email
          console.error("Error al obtener datos del usuario para el mensaje:", error);
          // Mostrar mensaje de bienvenida genérico
          document.querySelector('main section').innerHTML = '<h2>¡Bienvenido de nuevo! Has iniciado sesión correctamente.</h2><p>Ahora puedes explorar el sitio.</p>';
          // Ocultar el formulario de autenticación
          document.getElementById('auth-form').style.display = 'none';

          // Opcional: Mostrar el cuadro de usuario autenticado en el header
          const userInfoDiv = document.getElementById('user-info');
          if (userInfoDiv) {
            userInfoDiv.style.display = 'block';
            document.getElementById('user-name').textContent = userCredential.user.email;
          }
        });
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
  const name = document.getElementById('register-name').value;
  const lastname = document.getElementById('register-lastname').value;
  const cedula = document.getElementById('register-cedula').value;
  const date = document.getElementById('register-date').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;

  if (password !== confirmPassword) {
    document.getElementById('auth-message').textContent = "Las contraseñas no coinciden.";
    return;
  }

  registerUser(name, lastname, cedula, date, email, password);
});

// Mostrar el formulario de autenticación cuando la página cargue
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auth-form').style.display = 'block';
});

// --- Verificación de estado de autenticación ---
// Este listener se ejecuta cada vez que el estado de autenticación cambia
// (cuando inicia sesión, cierra sesión, o cuando la página se carga y ya había sesión previa)
auth.onAuthStateChanged((user) => {
  if (user) {
    // El usuario está autenticado
    console.log("Usuario autenticado detectado:", user.uid);

    // Mostrar mensaje de bienvenida en la primera sección de index.html (por ejemplo)
    // Y ocultar el formulario de autenticación
    const authSection = document.querySelector('main section');
    const authFormSection = document.getElementById('auth-form');
    if (authSection && authFormSection) {
      // Opcional: Obtener nombre del usuario desde la base de datos
      database.ref('users/' + user.uid).once('value')
        .then((snapshot) => {
          const userData = snapshot.val();
          const displayName = userData ? userData.name : user.email; // Usa nombre o email
          authSection.innerHTML = `<h2>¡Bienvenido, ${displayName}! Has iniciado sesión correctamente.</h2><p>Ahora puedes explorar el sitio.</p>`;
          authFormSection.style.display = 'none';
        })
        .catch((error) => {
          // Si hay error al obtener nombre, usar UID o email
          authSection.innerHTML = `<h2>¡Bienvenido! Has iniciado sesión correctamente.</h2><p>Ahora puedes explorar el sitio.</p>`;
          authFormSection.style.display = 'none';
        });
    }

    // Opcional: Mostrar el cuadro de usuario autenticado en el header (si lo tienes en otras páginas)
    const userInfoDiv = document.getElementById('user-info');
    if (userInfoDiv) {
        userInfoDiv.style.display = 'block';
        document.getElementById('user-name').textContent = user.email; // O el nombre obtenido arriba
    }

  } else {
    // No hay usuario autenticado
    console.log("No hay usuario autenticado.");

    // Opcional: Ocultar el cuadro de usuario autenticado si existe
    const userInfoDiv = document.getElementById('user-info');
    if (userInfoDiv) {
        userInfoDiv.style.display = 'none';
    }
    // Opcional: Mostrar el formulario de autenticación si estás en index.html
    const authFormSection = document.getElementById('auth-form');
    if (authFormSection) {
        authFormSection.style.display = 'block'; // Asegúrate de que esté visible si no hay sesión
    }
  }
});
// --- Fin de Verificación de estado de autenticación ---

// --- Función para cerrar sesión ---
// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  // Event listener para el botón de cerrar sesión
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      auth.signOut()
        .then(() => {
          console.log("Sesión cerrada.");
          // Recargar la página para que se actualice el estado
          window.location.reload();
        })
        .catch((error) => {
          console.error("Error al cerrar sesión:", error);
        });
    });
  } else {
    console.warn("Botón de cierre de sesión no encontrado. Asegúrate de que el elemento con id 'logout-btn' exista en el HTML.");
  }
});
// --- Fin de Función para cerrar sesión ---