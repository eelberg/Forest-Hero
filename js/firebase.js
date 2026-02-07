// ===========================================
// firebase.js - Cliente Firebase
// ===========================================

// Configuración de Firebase
// IMPORTANTE: Reemplazar estos valores con los de tu proyecto Firebase.
// Los encontrarás en: Firebase Console → Project Settings → General → Your apps → SDK config
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCvbCrR4wigxDNcUyRzt3TGxb_qCa_kuUw",
    authDomain: "forest-hero.firebaseapp.com",
    projectId: "forest-hero",
    storageBucket: "forest-hero.firebasestorage.app",
    messagingSenderId: "344033782560",
    appId: "1:344033782560:web:82cb6c2b5247777bd40545",
    measurementId: "G-5RHDFPK61H"
  };
  
// Inicializar Firebase (el SDK se carga via CDN en index.html)
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Provider de Google para OAuth
const googleProvider = new firebase.auth.GoogleAuthProvider();

/**
 * Obtiene la sesión actual del usuario (si existe).
 * En Firebase, auth.currentUser es síncrono pero puede ser null
 * antes de que se resuelva el estado. Usamos una promesa para esperar.
 * @returns {Promise<object|null>} El usuario o null.
 */
export function getSession() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user ? { user } : null);
        });
    });
}

/**
 * Obtiene el usuario actual autenticado (si existe).
 * @returns {Promise<object|null>} El usuario o null.
 */
export async function getCurrentUser() {
    const session = await getSession();
    return session?.user || null;
}

/**
 * Escucha cambios en el estado de autenticación.
 * @param {function} callback - Se llama con (user).
 */
export function onAuthStateChange(callback) {
    return auth.onAuthStateChanged(callback);
}

export { auth, db, googleProvider };
