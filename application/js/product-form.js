import { db, storage } from './firebaseConfig.js';
import { logOut, onAuthChange, getCurrentUser } from './auth.js';
import {
    collection,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

const pageTitle = document.getElementById('page-title');
const productForm = document.getElementById('product-form');
const formMessage = document.getElementById('form-message');
const submitBtn = document.getElementById('submit-btn');
const logoutBtn = document.getElementById('logout-btn');
const editProductIdInput = document.getElementById('edit-product-id');
const editProductImageUrlInput = document.getElementById('edit-product-image-url');
const currentImagePreview = document.getElementById('current-image-preview');
const previewImage = document.getElementById('preview-image');

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

let currentUser = null;
let isEditMode = false;

function showMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.className = isError ? 'error-message' : 'success-message';
    formMessage.style.display = 'block';
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
}

function validateImageFile(file) {
    if (!file) return { valid: true };

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload JPG, PNG, or WebP image.'
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: 'File size too large. Maximum size is 5MB.'
        };
    }

    return { valid: true };
}

async function uploadImage(imageFile, businessId) {
    const timestamp = Date.now();
    const filename = `products/${businessId}/${timestamp}_${imageFile.name}`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, imageFile);
    return await getDownloadURL(storageRef);
}

async function loadProductForEdit(productId) {
    try {
        const productDoc = await getDoc(doc(db, 'products', productId));

        if (!productDoc.exists()) {
            showMessage('Product not found', true);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            return;
        }

        const product = productDoc.data();

        if (product.businessId !== currentUser.uid) {
            showMessage('You do not have permission to edit this product', true);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            return;
        }

        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description;
        document.getElementById('product-price').value = product.price;

        if (product.imageURL) {
            editProductImageUrlInput.value = product.imageURL;
            previewImage.src = product.imageURL;
            currentImagePreview.style.display = 'block';
        }

        pageTitle.textContent = 'Edit Product';
        submitBtn.textContent = 'Update Product';
        isEditMode = true;

    } catch (error) {
        console.error('Error loading product:', error);
        showMessage('Error loading product: ' + error.message, true);
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('product-name').value.trim();
    const description = document.getElementById('product-description').value.trim();
    const price = document.getElementById('product-price').value;
    const imageFile = document.getElementById('product-image').files[0];

    if (!name || !description || !price) {
        showMessage('Please fill in all required fields.', true);
        return;
    }

    if (parseFloat(price) <= 0) {
        showMessage('Price must be greater than 0.', true);
        return;
    }

    if (imageFile) {
        const validation = validateImageFile(imageFile);
        if (!validation.valid) {
            showMessage(validation.error, true);
            return;
        }
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = isEditMode ? 'Updating...' : 'Adding...';

    try {
        let imageURL = editProductImageUrlInput.value || null;

        if (imageFile) {
            if (isEditMode && imageURL && !imageURL.includes('picsum.photos')) {
                try {
                    const oldImageRef = ref(storage, imageURL);
                    await deleteObject(oldImageRef);
                } catch (error) {
                    console.error('Error deleting old image:', error);
                }
            }

            imageURL = await uploadImage(imageFile, currentUser.uid);
        } else if (!isEditMode && !imageURL) {
            // Use a random placeholder image from picsum.photos
            const randomId = Math.floor(Math.random() * 1000);
            imageURL = `https://picsum.photos/seed/${randomId}/800/600`;
        }

        const businessDoc = await getDoc(doc(db, 'businesses', currentUser.uid));
        const businessDisplayName = businessDoc.exists() ? businessDoc.data().displayName : currentUser.email;

        const productData = {
            name,
            description,
            price: parseFloat(price),
            imageURL,
            businessDisplayName
        };

        if (isEditMode) {
            const productId = editProductIdInput.value;
            await updateDoc(doc(db, 'products', productId), productData);
            showMessage('Product updated successfully!');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            productData.businessId = currentUser.uid;
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
            showMessage('Product added successfully!');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        }

    } catch (error) {
        console.error('Error saving product:', error);
        showMessage(error.message, true);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
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
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (productId) {
            editProductIdInput.value = productId;
            loadProductForEdit(productId);
        }
    } else {
        window.location.href = 'login.html';
    }
}

productForm.addEventListener('submit', handleSubmit);
logoutBtn.addEventListener('click', handleLogout);
onAuthChange(handleAuthStateChange);
