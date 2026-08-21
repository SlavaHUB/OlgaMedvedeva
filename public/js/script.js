let currentPortfolio = [];
let currentReviews = [];
let adminPassword = "";
let isAdminLoggedIn = false;

const modalBackdrop = document.getElementById('modalBackdrop');
const modalWindowBox = document.getElementById('modalWindowBox');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalFooter = document.getElementById('modalFooter');

// Теперь модалка умеет быть "широкой" (isLarge)
function openModal(title, bodyHtml, footerButtonsHtml, isLarge = false) {
    modalTitle.innerText = title;
    modalBody.innerHTML = bodyHtml;
    modalFooter.innerHTML = footerButtonsHtml;
    
    if (isLarge) modalWindowBox.classList.add('large-modal');
    else modalWindowBox.classList.remove('large-modal');
    
    modalBackdrop.classList.add('active');
}

function closeModal() {
    modalBackdrop.classList.remove('active');
    setTimeout(() => modalBody.innerHTML = '', 300); // Очищаем после анимации
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
    div.innerText = text || '';
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
        showToast("Ошибка загрузки данных", "error");
    }
}

// РЕНДЕР КАРТОЧЕК НА ГЛАВНОЙ (Теперь они кликабельны)
function renderPortfolio() {
    const grid = document.getElementById('portfolioGrid');
    grid.innerHTML = '';

    currentPortfolio.forEach((work) => {
        // Поддержка старых данных (если title нет)
        const displayTitle = work.title || work.desc || 'Проект';
        const displayImg = work.mainImage || work.url;

        const card = document.createElement('div');
        card.className = 'portfolio-card';
        
        card.innerHTML = `
            <div class="portfolio-img-wrapper" onclick="openProjectDetails('${work._id}')">
                <img src="${displayImg}" alt="${escapeHtml(displayTitle)}" loading="lazy">
                <div class="portfolio-overlay"><span>Смотреть проект</span></div>
            </div>
            <div class="portfolio-info">
                <h4 class="portfolio-card-title" onclick="openProjectDetails('${work._id}')">${escapeHtml(displayTitle)}</h4>
                ${isAdminLoggedIn ? `<button class="portfolio-delete-btn admin-only" onclick="confirmDeleteWork('${work._id}')">Удалить</button>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

// ОТКРЫТИЕ КЕЙСА (ДЕТАЛЬНЫЙ ПРОСМОТР)
window.openProjectDetails = function(id) {
    const project = currentPortfolio.find(p => p._id === id);
    if (!project) return;

    const displayImg = project.mainImage || project.url;
    const gallery = project.gallery && project.gallery.length > 0 ? project.gallery : [displayImg];
    
    // Генерируем миниатюры
    let galleryHtml = '';
    if (gallery.length > 1) {
        galleryHtml = gallery.map(img => `
            <img src="${img}" class="gallery-thumb" onclick="document.getElementById('modalMainImage').src='${img}'" alt="thumb">
        `).join('');
    }

    // Собираем плашки с характеристиками
    let statsHtml = '';
    if (project.area) statsHtml += `<div class="stat-badge">📐 Площадь: <strong>${escapeHtml(project.area)}</strong></div>`;
    if (project.duration) statsHtml += `<div class="stat-badge">⏱ Сроки: <strong>${escapeHtml(project.duration)}</strong></div>`;
    if (project.budget) statsHtml += `<div class="stat-badge">💰 Бюджет: <strong>${escapeHtml(project.budget)}</strong></div>`;

    const html = `
        <div class="project-case-layout">
            <div class="case-media">
                <img src="${displayImg}" id="modalMainImage" class="case-main-image">
                ${galleryHtml ? `<div class="case-gallery">${galleryHtml}</div>` : ''}
            </div>
            <div class="case-info">
                ${statsHtml ? `<div class="case-stats">${statsHtml}</div>` : ''}
                
                ${project.task ? `
                    <div class="case-section">
                        <h4>Задача проекта</h4>
                        <p>${escapeHtml(project.task).replace(/\n/g, '<br>')}</p>
                    </div>
                ` : ''}
                
                ${project.solution ? `
                    <div class="case-section">
                        <h4>Реализация</h4>
                        <p>${escapeHtml(project.solution).replace(/\n/g, '<br>')}</p>
                    </div>
                ` : ''}
                
                ${!project.task && !project.solution ? `<p style="color: #666; font-style: italic;">Подробное описание для этого проекта пока не добавлено.</p>` : ''}
            </div>
        </div>
    `;

    openModal(project.title || 'Детали проекта', html, `<button class="btn btn-primary" onclick="closeModal()">Закрыть</button>`, true);
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
    document.getElementById('urlInputGroup').style.display = isUrl ? 'block' : 'none';
    document.getElementById('fileInputGroup').style.display = isUrl ? 'none' : 'block';
}

// ДОБАВЛЕНИЕ НОВОГО ПРОЕКТА
async function handleAddWork() {
    const uploadType = document.querySelector('input[name="uploadType"]:checked').value;
    const btn = document.getElementById('uploadWorkBtn');
    
    // Сбор данных со всех полей
    const title = document.getElementById('workTitleInput').value.trim() || 'Проект без названия';
    const area = document.getElementById('workAreaInput').value.trim();
    const duration = document.getElementById('workDurationInput').value.trim();
    const budget = document.getElementById('workBudgetInput').value.trim();
    const task = document.getElementById('workTaskInput').value.trim();
    const solution = document.getElementById('workSolutionInput').value.trim();

    btn.innerText = 'Загрузка...';
    btn.disabled = true;

    try {
        let response;
        if (uploadType === 'url') {
            const mainImage = document.getElementById('workMainImageInput').value.trim();
            if (!mainImage) throw new Error("Введите ссылку на фото");
            
            response = await fetch('/api/portfolio/url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword, title, mainImage, area, duration, budget, task, solution })
            });
        } else {
            const fileInput = document.getElementById('workFileInput');
            if (fileInput.files.length === 0) throw new Error("Выберите хотя бы один файл");
            
            const formData = new FormData();
            formData.append('password', adminPassword);
            formData.append('title', title);
            formData.append('area', area);
            formData.append('duration', duration);
            formData.append('budget', budget);
            formData.append('task', task);
            formData.append('solution', solution);
            
            // Добавляем все файлы в массив
            for(let i = 0; i < fileInput.files.length; i++) {
                formData.append('images', fileInput.files[i]);
            }
            
            response = await fetch('/api/portfolio/file', {
                method: 'POST',
                body: formData
            });
        }

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Ошибка сервера");

        currentPortfolio.unshift(result);
        renderPortfolio();
        
        // Очистка полей
        document.getElementById('workMainImageInput').value = '';
        document.getElementById('workFileInput').value = '';
        document.getElementById('workTitleInput').value = '';
        document.getElementById('workAreaInput').value = '';
        document.getElementById('workDurationInput').value = '';
        document.getElementById('workBudgetInput').value = '';
        document.getElementById('workTaskInput').value = '';
        document.getElementById('workSolutionInput').value = '';
        
        showToast("Проект успешно опубликован!");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.innerText = 'Опубликовать проект';
        btn.disabled = false;
    }
}

function confirmDeleteWork(id) {
    openModal("Удаление проекта", "<p>Точно удалить эту работу?</p>", `
        <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
        <button class="btn btn-danger" onclick="executeDeleteWork('${id}')">Удалить</button>
    `);
}

async function executeDeleteWork(id) {
    try {
        const response = await fetch(`/api/portfolio/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword })
        });
        if (!response.ok) throw new Error("Ошибка");
        currentPortfolio = currentPortfolio.filter(w => w._id !== id);
        renderPortfolio();
        closeModal();
        showToast("Удалено");
    } catch (error) { showToast(error.message, "error"); }
}

function confirmDeleteReview(id) {
    openModal("Удаление отзыва", "<p>Удалить отзыв?</p>", `
        <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
        <button class="btn btn-danger" onclick="executeDeleteReview('${id}')">Удалить</button>
    `);
}

async function executeDeleteReview(id) {
    try {
        const response = await fetch(`/api/reviews/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword })
        });
        if (!response.ok) throw new Error("Ошибка");
        currentReviews = currentReviews.filter(r => r._id !== id);
        renderReviews();
        closeModal();
        showToast("Удалено");
    } catch (error) { showToast(error.message, "error"); }
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        openModal("Вход", `
            <input type="password" id="adminPasswordInput" placeholder="Пароль" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ccc;">
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
            <button class="btn btn-primary" onclick="verifyAdminPassword()">Войти</button>
        `);
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
            showToast("Доступ открыт!");
        } else showToast("Неверный пароль", "error");
    } catch (err) { showToast("Ошибка связи", "error"); }
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
        if (!response.ok) throw new Error("Ошибка");
        const savedReview = await response.json();
        currentReviews.unshift(savedReview);
        renderReviews();
        e.target.reset();
        showToast("Отзыв опубликован!");
    } catch (error) { showToast("Ошибка", "error"); } 
    finally { submitBtn.disabled = false; submitBtn.innerText = 'Опубликовать отзыв'; }
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadData);
else loadData();