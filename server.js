require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Успешное подключение к MongoDB Atlas'))
    .catch(err => console.error('❌ Ошибка подключения к БД:', err));

const workSchema = new mongoose.Schema({
    title: { type: String, default: 'Дизайн-проект' },
    mainImage: { type: String, required: true },
    gallery: [{ type: String }],
    area: { type: String, default: '' },
    duration: { type: String, default: '' },
    budget: { type: String, default: '' },
    task: { type: String, default: '' },
    solution: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Work = mongoose.model('Work', workSchema);

const reviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'olga_portfolio',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1200, crop: 'limit' }]
    }
});
const upload = multer({ storage: storage });

app.post('/api/verify-password', (req, res) => {
    if (req.body.password === process.env.ADMIN_PASSWORD) res.status(200).json({ success: true });
    else res.status(403).json({ error: 'Неверный пароль' });
});

app.get('/api/portfolio', async (req, res) => {
    try {
        const works = await Work.find().sort({ createdAt: -1 });
        res.json(works);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/portfolio/url', async (req, res) => {
    try {
        const { password, title, mainImage, area, duration, budget, task, solution } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Доступ запрещен' });

        const newWork = new Work({
            title, mainImage, gallery: [mainImage], area, duration, budget, task, solution
        });
        await newWork.save();
        res.status(201).json(newWork);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

app.post('/api/portfolio/file', upload.array('images', 10), async (req, res) => {
    try {
        const { password, title, area, duration, budget, task, solution } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Доступ запрещен' });
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Файлы не загружены' });

        const mainImage = req.files[0].path;
        const gallery = req.files.map(file => file.path);

        const newWork = new Work({
            title, mainImage, gallery, area, duration, budget, task, solution
        });
        await newWork.save();
        res.status(201).json(newWork);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки файла' });
    }
});

app.delete('/api/portfolio/:id', async (req, res) => {
    try {
        if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Доступ запрещен' });
        await Work.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

app.get('/api/reviews', async (req, res) => {
    try {
        // 🔥 Убрали ограничение полей, теперь сервер возвращает все данные, включая контакт
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { name, contact, text } = req.body;
        if (!name || !contact || !text) return res.status(400).json({ error: 'Заполните все поля' });
        const newReview = new Review({ name, contact, text });
        await newReview.save();
        res.status(201).json({ _id: newReview._id, name: newReview.name, text: newReview.text });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сохранения отзыва' });
    }
});

app.delete('/api/reviews/:id', async (req, res) => {
    try {
        if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Доступ запрещен' });
        await Review.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});