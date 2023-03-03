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
const io = require('socket.io')(server, {
    cors: {
        origin: 'https://twitter-backend-xi.vercel.app',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
const User = require('./schemas/userSchema');

io.on('connection', async (socket) => {
    const username = socket.handshake.query.username;
    await User.updateOne(
        {
            username: username
        },
        {
            $set: {
                socketid: socket.id
            }
        }
    )
});
app.use(cors({
    origin: 'https://twitter-backend-xi.vercel.app',
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
    cloud_name: "dkp0y1roi",
    api_key: "352343729117897",
    api_secret: "N9YcZNBMneFCX50G0ITpixPmRIM"
});
app.use((req, res, next) => {
    req.io = io
    next()
});
app.use(express.static(path.join(__dirname, '.', 'twitter-clone')));
app.use('/api/user', userRoutes);
app.use('/api/tweet', tweetRoutes);
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '.', 'twitter-clone', 'index.html'))
});
mongoose.connect('mongodb+srv://saif_web_dev:37444547@cluster0.eobeuhu.mongodb.net/?retryWrites=true&w=majority');

server.listen(process.env.PORT || 3000, () => {
    console.log('Server listening on PORT 3000...')
});