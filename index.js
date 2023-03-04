const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const tweetRoutes = require('./routes/tweetRoutes');
const server = require('http').createServer(app);
const env = require('dotenv').config();

app.use(cors({
    origin: 'https://twitter-backend-eight.vercel.app/',
    credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json({
    limit: '200mb'
}));
app.use(bodyParser.urlencoded({
    limit: '200mb',
    extended: true,
    parameterLimit: 1000000
}));
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});
app.use(express.static(path.join(__dirname, '.', 'twitter-clone')));
app.use('/api/user', userRoutes);
app.use('/api/tweet', tweetRoutes);
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '.', 'twitter-clone', 'index.html'))
});
mongoose.connect(process.env.MONGO_DB_URL);
server.listen(process.env.VERCEL_PORT || 3000);