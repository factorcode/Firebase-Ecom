import { signUp, signIn, onAuthChange } from './auth.js';

const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const errorMessage = document.getElementById('error-message');

let isLoginMode = true;

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;

    if (isLoginMode) {
        authTitle.textContent = 'Login';
        authSubmitBtn.textContent = 'Login';
        authToggleText.textContent = "Don't have an account?";
        authToggleBtn.textContent = 'Sign Up';
    } else {
        authTitle.textContent = 'Sign Up';
        authSubmitBtn.textContent = 'Sign Up';
        authToggleText.textContent = 'Already have an account?';
        authToggleBtn.textContent = 'Login';
    }

    errorMessage.style.display = 'none';
    authForm.reset();
}

async function handleAuthSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('Please fill in all fields.');
        return;
    }

    authSubmitBtn.disabled = true;
    authSubmitBtn.classList.add('loading');
    errorMessage.style.display = 'none';

    try {
        if (isLoginMode) {
            await signIn(email, password);
        } else {
            await signUp(email, password);
        }
        window.location.href = 'dashboard.html';
    } catch (error) {
        showError(error.message);
        authSubmitBtn.disabled = false;
        authSubmitBtn.classList.remove('loading');
    }
}

function checkAuthState(user) {
    if (user) {
        window.location.href = 'dashboard.html';
    }
}

authToggleBtn.addEventListener('click', toggleAuthMode);
authForm.addEventListener('submit', handleAuthSubmit);
onAuthChange(checkAuthState);
