import { db } from './firebaseConfig.js';
import { doc, onSnapshot, updateDoc, arrayRemove, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getCurrentUser, onAuthChange, logOut } from './auth.js';

const productsGrid = document.getElementById('products-grid');
const emptyState = document.getElementById('empty-state');
const authMessage = document.getElementById('auth-message');
const favoritesContent = document.getElementById('favorites-content');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let favoritesListener = null;

function createProductCard(product) {
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image-container">
                <button class="favorite-btn favorited"
                        data-product-id="${product.id}"
                        aria-label="Remove from favorites">
                    <i class="fa-solid fa-heart"></i>
                </button>
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

function renderFavorites(favorites) {
    productsGrid.innerHTML = '';

    if (favorites.length === 0) {
        productsGrid.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    productsGrid.style.display = 'grid';

    favorites.forEach((product) => {
        const productCard = createProductCard(product);
        productsGrid.insertAdjacentHTML('beforeend', productCard);
    });

    // Add event listeners to favorite buttons
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', handleRemoveFavorite);
    });
}

async function handleRemoveFavorite(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const productId = btn.dataset.productId;

    if (!currentUser) {
        return;
    }

    try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            favorites: arrayRemove(productId)
        });
    } catch (error) {
        console.error('Error removing favorite:', error);
        alert('Failed to remove favorite. Please try again.');
    }
}

async function loadFavorites() {
    if (!currentUser) {
        authMessage.style.display = 'block';
        favoritesContent.style.display = 'none';
        return;
    }

    authMessage.style.display = 'none';
    favoritesContent.style.display = 'block';

    try {
        // Unsubscribe from previous listener if exists
        if (favoritesListener) {
            favoritesListener();
        }

        const userRef = doc(db, 'users', currentUser.uid);

        favoritesListener = onSnapshot(userRef, async (docSnapshot) => {
            const favoriteIds = docSnapshot.data()?.favorites || [];

            if (favoriteIds.length === 0) {
                renderFavorites([]);
                return;
            }

            // Fetch product details for each favorite ID
            const favoriteProducts = [];
            for (const productId of favoriteIds) {
                try {
                    const productRef = doc(db, 'products', productId);
                    const productDoc = await getDoc(productRef);
                    if (productDoc.exists()) {
                        const product = { id: productDoc.id, ...productDoc.data() };
                        favoriteProducts.push(product);
                    }
                } catch (error) {
                    console.error(`Error fetching product ${productId}:`, error);
                }
            }

            renderFavorites(favoriteProducts);
        }, (error) => {
            console.error('Error fetching favorites:', error);
            productsGrid.innerHTML = '<p class="error-message">Error loading favorites. Please try again later.</p>';
        });
    } catch (error) {
        console.error('Error setting up favorites listener:', error);
        productsGrid.innerHTML = '<p class="error-message">Error loading favorites. Please check your Firebase configuration.</p>';
    }
}

// Auth state observer
onAuthChange((user) => {
    currentUser = user;
    loadFavorites();
});

// Logout handler
logoutBtn.addEventListener('click', async () => {
    try {
        await logOut();
        window.location.href = 'customer-login.html';
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Failed to logout. Please try again.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    currentUser = getCurrentUser();
    loadFavorites();
});
