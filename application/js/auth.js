import { auth } from './firebaseConfig.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

export async function signUp(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential;
    } catch (error) {
        let errorMessage = 'An error occurred during sign up.';

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Please log in instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address format.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password should be at least 6 characters long.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                break;
            default:
                errorMessage = error.message;
        }

        throw new Error(errorMessage);
    }
}

export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential;
    } catch (error) {
        let errorMessage = 'An error occurred during sign in.';

        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address format.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email. Please sign up first.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'Invalid email or password. Please try again.';
                break;
            default:
                errorMessage = error.message;
        }

        throw new Error(errorMessage);
    }
}

export async function logOut() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error signing out:', error);
        throw new Error('Failed to log out. Please try again.');
    }
}

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

export function getCurrentUser() {
    return auth.currentUser;
}
