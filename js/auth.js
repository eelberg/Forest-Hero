// ===========================================
// auth.js - Autenticación con Firebase
// ===========================================

import { auth, db, googleProvider, getSession } from './firebase.js';

/**
 * Registra un nuevo usuario con email y password.
 * Firebase Auth auto-loguea al usuario tras el registro (no requiere confirmación por email por defecto).
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object|null, error: object|null}>}
 */
export async function signUpWithEmail(email, password) {
    try {
        const credential = await auth.createUserWithEmailAndPassword(email, password);
        return { user: credential.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
}

/**
 * Inicia sesión con email y password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object|null, error: object|null}>}
 */
export async function signInWithEmail(email, password) {
    try {
        const credential = await auth.signInWithEmailAndPassword(email, password);
        return { user: credential.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
}

/**
 * Inicia sesión con Google OAuth via popup.
 * Retorna el usuario directamente (no requiere redirect).
 * @returns {Promise<{user: object|null, error: object|null}>}
 */
export async function signInWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        return { user: result.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
}

/**
 * Cierra la sesión del usuario actual.
 */
export async function signOut() {
    try {
        await auth.signOut();
        return { error: null };
    } catch (error) {
        return { error };
    }
}

/**
 * Guarda o actualiza el seudónimo del usuario en la colección profiles.
 * @param {string} userId - UID del usuario
 * @param {string} pseudonym - Seudónimo elegido
 * @returns {Promise<{success: boolean, error: object|null}>}
 */
export async function savePseudonym(userId, pseudonym) {
    try {
        await db.collection('profiles').doc(userId).set({
            pseudonym: pseudonym,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { success: true, error: null };
    } catch (error) {
        console.error('Error guardando seudónimo:', error);
        return { success: false, error };
    }
}

/**
 * Obtiene el perfil del usuario (incluye seudónimo).
 * @param {string} userId - UID del usuario
 * @returns {Promise<{profile: object|null, error: object|null}>}
 */
export async function getUserProfile(userId) {
    try {
        const doc = await db.collection('profiles').doc(userId).get();
        if (doc.exists) {
            return { profile: { id: doc.id, ...doc.data() }, error: null };
        }
        return { profile: null, error: null };
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        return { profile: null, error };
    }
}

/**
 * Obtiene el estado completo del usuario actual:
 * sesión, usuario y perfil con seudónimo.
 * @returns {Promise<{user: object|null, profile: object|null, pseudonym: string}>}
 */
export async function getFullUserState() {
    const session = await getSession();
    if (!session) {
        return { user: null, profile: null, pseudonym: 'Anónimo' };
    }

    const user = session.user;
    const { profile } = await getUserProfile(user.uid);

    return {
        user,
        profile,
        pseudonym: profile?.pseudonym || 'Anónimo',
    };
}
