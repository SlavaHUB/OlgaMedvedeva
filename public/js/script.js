let currentPortfolio = [];
let currentReviews = [];
let adminPassword = "";
let isAdminLoggedIn = false;

const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalFooter = document.getElementById('modalFooter');

function openModal(title, bodyHtml, footerButtonsHtml) {
    modalTitle.innerText = title;
    modalBody.innerHTML = bodyHtml;
    modalFooter.innerHTML = footerButtonsHtml;
    modalBackdrop.classList.add('active');
}

function closeModal() {
    modalBackdrop.classList.remove('active');
}

modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

async function loadData() {
    try {
        const [portfolioRes, reviewsRes] = await Promise.all([
            fetch('/api/portfolio'),
            fetch('/api/reviews')
        ]);
        
        if (portfolioRes.ok) currentPortfolio = await portfolioRes.json();
        if (reviewsRes.ok) currentReviews = await reviewsRes.json();
        
        renderPortfolio();
        renderReviews();
    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        showToast("Ошибка соединения с сервером", "error");
    }
}

function renderPortfolio() {
    const grid = document.getElementById('portfolioGrid');
    grid.innerHTML = '';

    currentPortfolio.forEach((work) => {
        const card = document.createElement('div');
        card.className = 'portfolio-card';
        card.style.display = 'flex'; 
        card.style.flexDirection = 'column';

        card.innerHTML = `
            <div style="flex-grow: 1; overflow: hidden; position: relative;">
                <img src="${work.url}" alt="Проект" loading="lazy" style="height: 100%; width: 100%; object-fit: cover;">
                ${isAdminLoggedIn ? `<button class="portfolio-delete-btn admin-only" onclick="confirmDeleteWork('${work._id}')">Удалить</button>` : ''}
            </div>
            ${work.desc ? `<div class="portfolio-desc">${escapeHtml(work.desc)}</div>` : ''}
        `;
        grid.appendChild(card);
    });
}

function renderReviews() {
    const grid = document.getElementById('reviewsGrid');
    grid.innerHTML = '';

    currentReviews.forEach((rev) => {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML = `
            <div class="review-header">
                <span class="review-author">${escapeHtml(rev.name)}</span>
                ${isAdminLoggedIn ? `<button class="review-delete-btn admin-only" onclick="confirmDeleteReview('${rev._id}')">Удалить</button>` : ''}
            </div>
            <p class="review-text">«${escapeHtml(rev.text)}»</p>
        `;
        grid.appendChild(card);
    });
}

function toggleUploadMode() {
    const isUrl = document.querySelector('input[name="uploadType"]:checked').value === 'url';
    document.getElementById('urlInputGroup').style.display = isUrl ? 'flex' : 'none';
    document.getElementById('fileInputGroup').style.display = isUrl ? 'none' : 'flex';
}

async function handleAddWork() {
    const uploadType = document.querySelector('input[name="uploadType"]:checked').value;
    const desc = document.getElementById('workDescInput').value.trim();
    const btn = document.getElementById('uploadWorkBtn');
    
    btn.innerText = 'Загрузка...';
    btn.disabled = true;

    try {
        let response;
        
        if (uploadType === 'url') {
            const url = document.getElementById('workUrlInput').value.trim();
            if (!url) throw new Error("Введите ссылку на фото");
            
            response = await fetch('/api/portfolio/url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, desc, password: adminPassword })
            });
        } else {
            const fileInput = document.getElementById('workFileInput');
            if (!fileInput.files[0]) throw new Error("Выберите файл на компьютере");
            
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            formData.append('desc', desc);
            formData.append('password', adminPassword);
            
            response = await fetch('/api/portfolio/file', {
                method: 'POST',
                body: formData
            });
        }

        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || "Ошибка сервера");

        currentPortfolio.unshift(result);
        renderPortfolio();
        
        document.getElementById('workUrlInput').value = '';
        document.getElementById('workFileInput').value = '';
        document.getElementById('workDescInput').value = '';
        showToast("Проект успешно добавлен!");

    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.innerText = 'Добавить в портфолио';
        btn.disabled = false;
    }
}

function confirmDeleteWork(id) {
    openModal(
        "Удаление проекта",
        "<p>Вы действительно хотите удалить эту работу из галереи?</p>",
        `
        <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
        <button class="btn btn-danger" onclick="executeDeleteWork('${id}')">Да, удалить</button>
        `
    );
}

async function executeDeleteWork(id) {
    try {
        const response = await fetch(`/api/portfolio/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword })
        });
        
        if (!response.ok) throw new Error("Не удалось удалить");
        
        currentPortfolio = currentPortfolio.filter(w => w._id !== id);
        renderPortfolio();
        closeModal();
        showToast("Проект удален");
    } catch (error) {
        showToast(error.message, "error");
    }
}

function confirmDeleteReview(id) {
    openModal(
        "Удаление отзыва",
        "<p>Вы уверены, что хотите безвозвратно удалить этот отзыв?</p>",
        `
        <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
        <button class="btn btn-danger" onclick="executeDeleteReview('${id}')">Удалить отзыв</button>
        `
    );
}

async function executeDeleteReview(id) {
    try {
        const response = await fetch(`/api/reviews/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword })
        });
        
        if (!response.ok) throw new Error("Не удалось удалить");
        
        currentReviews = currentReviews.filter(r => r._id !== id);
        renderReviews();
        closeModal();
        showToast("Отзыв удален");
    } catch (error) {
        showToast(error.message, "error");
    }
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        openModal(
            "Вход в панель управления",
            `
            <p style="margin-bottom: 12px;">Введите секретный пароль администратора:</p>
            <input type="password" id="adminPasswordInput" placeholder="Пароль" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ccc;">
            `,
            `
            <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
            <button class="btn btn-primary" onclick="verifyAdminPassword()">Войти</button>
            `
        );
        setTimeout(() => document.getElementById('adminPasswordInput')?.focus(), 100);
    }
});

async function verifyAdminPassword() {
    const inputPass = document.getElementById('adminPasswordInput').value;
    
    try {
        const response = await fetch('/api/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: inputPass })
        });

        if (response.ok) {
            adminPassword = inputPass;
            isAdminLoggedIn = true;
            document.body.classList.add('admin-mode');
            renderPortfolio();
            renderReviews();
            closeModal();
            showToast("Режим администратора активирован!");
        } else {
            showToast("Неверный пароль доступа", "error");
        }
    } catch (err) {
        showToast("Ошибка связи с сервером", "error");
    }
}

document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('revName').value.trim();
    const contactInput = document.getElementById('revContact');
    const contact = contactInput.value.trim();
    const text = document.getElementById('revText').value.trim();
    const contactError = document.getElementById('contactError');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?[\d\s.-]{7,10}$/;

    if (!emailRegex.test(contact) && !phoneRegex.test(contact)) {
        contactError.classList.add('active');
        contactInput.focus();
        return;
    }
    contactError.classList.remove('active');

    submitBtn.disabled = true;
    submitBtn.innerText = 'Отправка...';

    try {
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, contact, text })
        });

        if (!response.ok) throw new Error("Не удалось отправить отзыв");

        const savedReview = await response.json();
        currentReviews.unshift(savedReview);
        renderReviews();
        
        e.target.reset();
        showToast("Спасибо за ваш отзыв! Он опубликован.");
    } catch (error) {
        showToast("Ошибка при отправке", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Опубликовать отзыв';
    }
});

function initApp() {
    loadData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}