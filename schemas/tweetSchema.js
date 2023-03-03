const mongoose = require('mongoose');

const tweetSchema = new mongoose.Schema({
    fullname: {
        type: String
    },
    username: {
        type: String
    },
    profilepictureurl: {
        type: String
    },
    caption: {
        type: String
    },
    imageurl: {
        type: String
    },
    imagepublicid: {
        type: String
    },
    likes: [
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
    comments: [
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
            caption: {
                type: String
            },
            verified: {
                type: Boolean
            },
            creationdate: {
                type: Date,
                default: new Date()
            }
        }
    ],
    verified: {
        type: Boolean
    },
    creationdate: {
        type: Date,
        default: new Date()
    }
});
module.exports = mongoose.model('Tweet', tweetSchema);