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
    .then(() => {})
    .catch(err => console.error(err));

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

const packageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: String, required: true },
    includes: { type: String, required: true },
    projectLink: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Package = mongoose.model('Package', packageSchema);

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
    else res.status(403).json({ error: 'Access Denied' });
});

app.get('/api/portfolio', async (req, res) => {
    try {
        const works = await Work.find().sort({ createdAt: -1 });
        res.json(works);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

app.post('/api/portfolio/url', async (req, res) => {
    try {
        const { password, title, mainImage, area, duration, budget, task, solution } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Access Denied' });

        const newWork = new Work({ 
            title, mainImage, gallery: [mainImage], area, duration, budget, task, solution 
        });
        await newWork.save();
        res.status(201).json(newWork);
    } catch (error) {
        res.status(500).json({ error: 'Save Error' });
    }
});

app.post('/api/portfolio/file', upload.array('images', 10), async (req, res) => {
    try {
        const { password, title, area, duration, budget, task, solution } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Access Denied' });
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

        const mainImage = req.files[0].path; 
        const gallery = req.files.map(file => file.path); 

        const newWork = new Work({ 
            title, mainImage, gallery, area, duration, budget, task, solution 
        }); 
        await newWork.save();
        res.status(201).json(newWork);
    } catch (error) {
        res.status(500).json({ error: 'Upload Error' });
    }
});

app.delete('/api/portfolio/:id', async (req, res) => {
    try {
        if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Access Denied' });
        await Work.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Delete Error' });
    }
});

app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { name, contact, text, date } = req.body;
        if (!name || !contact || !text) return res.status(400).json({ error: 'Invalid data' });
        
        const reviewData = { name, contact, text };
        if (date) {
            reviewData.createdAt = new Date(date);
        }

        const newReview = new Review(reviewData);
        await newReview.save();
        res.status(201).json(newReview);
    } catch (error) {
        res.status(500).json({ error: 'Save Error' });
    }
});

app.put('/api/reviews/:id', async (req, res) => {
    try {
        const { password, date } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Access Denied' });
        
        const updatedReview = await Review.findByIdAndUpdate(
            req.params.id, 
            { createdAt: new Date(date) },
            { new: true }
        );
        res.status(200).json(updatedReview);
    } catch (error) {
        res.status(500).json({ error: 'Update Error' });
    }
});

app.delete('/api/reviews/:id', async (req, res) => {
    try {
        if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Access Denied' });
        await Review.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Delete Error' });
    }
});

app.get('/api/packages', async (req, res) => {
    try {
        const packages = await Package.find().sort({ createdAt: -1 });
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

app.post('/api/packages', async (req, res) => {
    try {
        const { password, title, price, includes, projectLink } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Access Denied' });
        if (!title || !price || !includes) return res.status(400).json({ error: 'Invalid data' });

        const newPackage = new Package({ title, price, includes, projectLink });
        await newPackage.save();
        res.status(201).json(newPackage);
    } catch (error) {
        res.status(500).json({ error: 'Save Error' });
    }
});

app.delete('/api/packages/:id', async (req, res) => {
    try {
        if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Access Denied' });
        await Package.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Delete Error' });
    }
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {});