// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAg-DSJpGSSv5Q3Eeu7RUTkLG1ubzJaTO8",
  authDomain: "proyecto-1-f0a34.firebaseapp.com",
  projectId: "proyecto-1-f0a34",
  storageBucket: "proyecto-1-f0a34.firebasestorage.app",
  messagingSenderId: "648004063581",
  appId: "1:648004063581:web:100b8ce467031b548a98b4",
  measurementId: "G-6HR1KCH9ME"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Proveedor de Google para Firebase Auth
export const googleProvider = new GoogleAuthProvider();