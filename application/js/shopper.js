import { db } from './firebaseConfig.js';
import { collection, query, onSnapshot, orderBy, doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getCurrentUser, onAuthChange, logOut } from './auth.js';

const productsGrid = document.getElementById('products-grid');
const emptyState = document.getElementById('empty-state');
const businessFilter = document.getElementById('business-filter');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const favoritesLink = document.getElementById('favorites-link');

let allProducts = [];
let currentUser = null;
let userFavorites = new Set();

function createProductCard(product) {
    const isFavorite = userFavorites.has(product.id);
    const favoriteBtn = currentUser ? `
        <button class="favorite-btn ${isFavorite ? 'favorited' : ''}"
                data-product-id="${product.id}"
                aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
            <i class="${isFavorite ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        </button>
    ` : '';

    return `
        <div class="product-card" data-business="${product.businessDisplayName || 'Unknown'}" data-product-id="${product.id}">
            <div class="product-image-container">
                ${favoriteBtn}
                <img src="${product.imageURL}"
                     alt="${product.name}"
                     class="product-image">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <p class="product-price">$${parseFloat(product.price).toFixed(2)}</p>
                <p class="product-business">By: ${product.businessDisplayName || 'Unknown Business'}</p>
            </div>
        </div>
    `;
}

function renderProducts(products) {
    productsGrid.innerHTML = '';

    if (products.length === 0) {
        productsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    productsGrid.style.display = 'grid';

    products.forEach((product) => {
        const productCard = createProductCard(product);
        productsGrid.insertAdjacentHTML('beforeend', productCard);
    });

    // Add event listeners to favorite buttons
    if (currentUser) {
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', handleFavoriteClick);
        });
    }
}

function updateBusinessFilter() {
    const businesses = new Set();

    allProducts.forEach(product => {
        const businessName = product.businessDisplayName || 'Unknown Business';
        businesses.add(businessName);
    });

    const currentSelection = businessFilter.value;
    businessFilter.innerHTML = '<option value="all">All Businesses</option>';

    Array.from(businesses).sort().forEach(business => {
        const option = document.createElement('option');
        option.value = business;
        option.textContent = business;
        businessFilter.appendChild(option);
    });

    if (businesses.has(currentSelection)) {
        businessFilter.value = currentSelection;
    }
}

function filterProducts() {
    const selectedBusiness = businessFilter.value;

    if (selectedBusiness === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(product =>
            (product.businessDisplayName || 'Unknown Business') === selectedBusiness
        );
        renderProducts(filtered);
    }
}

function loadProducts() {
    try {
        const productsRef = collection(db, 'products');
        const q = query(productsRef, orderBy('createdAt', 'desc'));

        onSnapshot(q, (snapshot) => {
            allProducts = [];

            if (snapshot.empty) {
                productsGrid.style.display = 'none';
                emptyState.style.display = 'block';
                businessFilter.innerHTML = '<option value="all">All Businesses</option>';
                return;
            }

            snapshot.forEach((doc) => {
                allProducts.push({ id: doc.id, ...doc.data() });
            });

            updateBusinessFilter();
            filterProducts();
        }, (error) => {
            console.error('Error fetching products:', error);
            productsGrid.innerHTML = '<p class="error-message">Error loading products. Please try again later.</p>';
        });
    } catch (error) {
        console.error('Error setting up product listener:', error);
        productsGrid.innerHTML = '<p class="error-message">Error loading products. Please check your Firebase configuration.</p>';
    }
}

async function handleFavoriteClick(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const productId = btn.dataset.productId;

    if (!currentUser) {
        alert('Please login to add favorites');
        return;
    }

    try {
        const userRef = doc(db, 'users', currentUser.uid);

        if (userFavorites.has(productId)) {
            // Remove from favorites
            await updateDoc(userRef, {
                favorites: arrayRemove(productId)
            });

            userFavorites.delete(productId);
            btn.classList.remove('favorited');
            btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
            btn.setAttribute('aria-label', 'Add to favorites');
        } else {
            // Add to favorites - create user document if it doesn't exist
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                await setDoc(userRef, {
                    favorites: [productId]
                });
            } else {
                await updateDoc(userRef, {
                    favorites: arrayUnion(productId)
                });
            }

            userFavorites.add(productId);
            btn.classList.add('favorited');
            btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
            btn.setAttribute('aria-label', 'Remove from favorites');
        }
    } catch (error) {
        console.error('Error updating favorite:', error);
        alert('Failed to update favorite. Please try again.');
    }
}

async function loadUserFavorites() {
    if (!currentUser) {
        userFavorites.clear();
        return;
    }

    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        const favorites = userDoc.data()?.favorites || [];

        userFavorites.clear();
        favorites.forEach(productId => {
            userFavorites.add(productId);
        });
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

function updateAuthUI() {
    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        favoritesLink.style.display = 'inline-block';
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        favoritesLink.style.display = 'none';
    }
}

// Auth state observer
onAuthChange(async (user) => {
    currentUser = user;
    await loadUserFavorites();
    updateAuthUI();
    filterProducts(); // Re-render products with updated favorite states
});

// Auth button handlers
loginBtn.addEventListener('click', () => {
    window.location.href = 'customer-login.html';
});

logoutBtn.addEventListener('click', async () => {
    try {
        await logOut();
        userFavorites.clear();
        filterProducts(); // Re-render products without favorite buttons
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Failed to logout. Please try again.');
    }
});

businessFilter.addEventListener('change', filterProducts);

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});
