// Firebase (mismo proyecto que towers: los usuarios se crean allá).
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

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
export const auth = getAuth(app);
