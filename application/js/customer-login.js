import { signIn, signUp, onAuthChange } from './auth.js';

const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const errorMessage = document.getElementById('error-message');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

let isLoginMode = true;

// Check if user is already logged in
onAuthChange((user) => {
    if (user) {
        window.location.href = 'shopper.html';
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    errorMessage.style.display = 'none';
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = isLoginMode ? 'Logging in...' : 'Signing up...';

    try {
        if (isLoginMode) {
            await signIn(email, password);
        } else {
            await signUp(email, password);
        }
        window.location.href = 'shopper.html';
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
    }
});

authToggleBtn.addEventListener('click', () => {
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
});
