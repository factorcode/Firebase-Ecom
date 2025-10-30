import { db } from './firebaseConfig.js';
import { collection, query, onSnapshot, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const productsGrid = document.getElementById('products-grid');
const emptyState = document.getElementById('empty-state');
const businessFilter = document.getElementById('business-filter');

let allProducts = [];

function createProductCard(product) {
    return `
        <div class="product-card" data-business="${product.businessDisplayName || 'Unknown'}">
            <div class="product-image-container">
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
                allProducts.push(doc.data());
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

businessFilter.addEventListener('change', filterProducts);

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});
