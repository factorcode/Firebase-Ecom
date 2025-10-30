import { db } from './firebaseConfig.js';
import { logOut, onAuthChange } from './auth.js';
import {
    collection,
    query,
    where,
    onSnapshot,
    deleteDoc,
    doc,
    orderBy,
    getDoc,
    setDoc
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import {
    ref,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';
import { storage } from './firebaseConfig.js';

const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const businessProductsContainer = document.getElementById('business-products');
const noProductsMessage = document.getElementById('no-products');
const businessDisplayNameInput = document.getElementById('business-display-name');
const saveBusinessNameBtn = document.getElementById('save-business-name-btn');
const profileMessage = document.getElementById('profile-message');

let currentUser = null;

function createProductCard(product, productId) {
    return `
        <div class="business-product-card" data-product-id="${productId}">
            <img src="${product.imageURL || 'https://via.placeholder.com/100?text=No+Image'}"
                 alt="${product.name}"
                 class="business-product-image"
                 onerror="this.src='https://via.placeholder.com/100?text=Error'">
            <div class="business-product-info">
                <h4>${product.name}</h4>
                <p>${product.description}</p>
                <p class="business-product-price">$${parseFloat(product.price).toFixed(2)}</p>
                <div class="business-product-actions">
                    <a href="product-form.html?id=${productId}" class="btn btn-secondary">Edit</a>
                    <button class="btn btn-danger delete-btn" data-product-id="${productId}" data-image-url="${product.imageURL || ''}">Delete</button>
                </div>
            </div>
        </div>
    `;
}

function loadBusinessProducts(businessId) {
    try {
        const productsRef = collection(db, 'products');
        const q = query(
            productsRef,
            where('businessId', '==', businessId),
            orderBy('createdAt', 'desc')
        );

        onSnapshot(q, (snapshot) => {
            businessProductsContainer.innerHTML = '';

            if (snapshot.empty) {
                businessProductsContainer.style.display = 'none';
                noProductsMessage.style.display = 'block';
                return;
            }

            noProductsMessage.style.display = 'none';
            businessProductsContainer.style.display = 'flex';

            snapshot.forEach((docSnapshot) => {
                const product = docSnapshot.data();
                const productId = docSnapshot.id;
                const productCard = createProductCard(product, productId);
                businessProductsContainer.insertAdjacentHTML('beforeend', productCard);
            });

            attachDeleteListeners();
        }, (error) => {
            console.error('Error loading products:', error);
            businessProductsContainer.innerHTML = '<p class="error-message">Error loading products.</p>';
        });
    } catch (error) {
        console.error('Error setting up product listener:', error);
    }
}

function attachDeleteListeners() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteProduct);
    });
}

async function handleDeleteProduct(e) {
    const productId = e.target.dataset.productId;
    const imageURL = e.target.dataset.imageUrl;
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    const productName = productCard.querySelector('h4').textContent;

    if (!confirm(`Are you sure you want to delete "${productName}"?`)) {
        return;
    }

    try {
        e.target.disabled = true;
        e.target.textContent = 'Deleting...';

        if (imageURL && !imageURL.includes('placeholder')) {
            try {
                const imageRef = ref(storage, imageURL);
                await deleteObject(imageRef);
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }

        await deleteDoc(doc(db, 'products', productId));

    } catch (error) {
        alert('Failed to delete product: ' + error.message);
        e.target.disabled = false;
        e.target.textContent = 'Delete';
    }
}

function showProfileMessage(message, isError = false) {
    profileMessage.textContent = message;
    profileMessage.className = isError ? 'error-message' : 'success-message';
    profileMessage.style.display = 'block';
    setTimeout(() => {
        profileMessage.style.display = 'none';
    }, 3000);
}

async function loadBusinessProfile(businessId) {
    try {
        const businessDoc = await getDoc(doc(db, 'businesses', businessId));

        if (businessDoc.exists()) {
            const businessData = businessDoc.data();
            businessDisplayNameInput.value = businessData.displayName || '';
        }
    } catch (error) {
        console.error('Error loading business profile:', error);
    }
}

async function handleSaveBusinessName() {
    const displayName = businessDisplayNameInput.value.trim();

    if (!displayName) {
        showProfileMessage('Please enter a business name', true);
        return;
    }

    try {
        saveBusinessNameBtn.disabled = true;
        saveBusinessNameBtn.textContent = 'Saving...';

        await setDoc(doc(db, 'businesses', currentUser.uid), {
            displayName: displayName,
            email: currentUser.email,
            updatedAt: new Date()
        });

        showProfileMessage('Business name saved successfully!');
    } catch (error) {
        console.error('Error saving business name:', error);
        showProfileMessage('Error saving business name: ' + error.message, true);
    } finally {
        saveBusinessNameBtn.disabled = false;
        saveBusinessNameBtn.textContent = 'Save Business Name';
    }
}

async function handleLogout() {
    try {
        await logOut();
        window.location.href = 'login.html';
    } catch (error) {
        alert(error.message);
    }
}

function handleAuthStateChange(user) {
    currentUser = user;

    if (user) {
        userEmailSpan.textContent = user.email;
        loadBusinessProducts(user.uid);
        loadBusinessProfile(user.uid);
    } else {
        window.location.href = 'login.html';
    }
}

saveBusinessNameBtn.addEventListener('click', handleSaveBusinessName);
logoutBtn.addEventListener('click', handleLogout);
onAuthChange(handleAuthStateChange);
