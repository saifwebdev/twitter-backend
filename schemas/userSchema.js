const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullname: {
        type: String
    },
    username: {
        type: String
    },
    password: {
        type: String
    },
    socketid: {
        type: String
    },
    profilepictureurl: {
        type: String,
        default: 'https://res.cloudinary.com/dkp0y1roi/image/upload/v1673166489/twitter-default-profilepicture_c7wbhu.jpg'
    },
    profilepicturepublicid: {
        type: String
    },
    bio: {
        type: String
    },
    followers: [
        {
            fullname: {
                type: String
            },
            username: {
                type: String
            },
            profilepictureurl: {
                type: String
            },
            verified: {
                type: Boolean
            }
        }
    ],
    following: [
        {
            fullname: {
                type: String
            },
            username: {
                type: String
            },
            profilepictureurl: {
                type: String
            },
            verified: {
                type: Boolean
            }
        }
    ],
    verified: {
        type: Boolean,
        default: false
    },
    creationdate: {
        type: Date,
        default: new Date()
    }
});
module.exports = mongoose.model('User', userSchema);