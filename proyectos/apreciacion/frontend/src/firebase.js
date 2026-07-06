// Firebase (mismo proyecto que towers: los usuarios se crean allá).
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCXThSlDXwOZPSqcGSi2lMNF20bXAk1tfU",
  authDomain: "tower-ing.firebaseapp.com",
  databaseURL: "https://tower-ing-default-rtdb.firebaseio.com",
  projectId: "tower-ing",
  storageBucket: "tower-ing.firebasestorage.app",
  messagingSenderId: "440636238988",
  appId: "1:440636238988:web:58291c1d59c98f695b1fa9",
};

const app = initializeApp(firebaseConfig);

// Usamos initializeAuth con una CADENA de persistencia en lugar de getAuth().
// Motivo: getAuth() usa IndexedDB por defecto y, si el navegador lo bloquea
// (modo incógnito, restricciones de almacenamiento, algunas extensiones), la
// inicialización de Auth puede QUEDARSE COLGADA y onAuthStateChanged nunca
// dispara → toda la UI se congela. Con esta lista, Firebase prueba cada método
// en orden y usa el primero que funcione, cayendo hasta memoria si es preciso.
export const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
  ],
});
