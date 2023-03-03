const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    username: {
        type: String
    },
    notifications: [
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
            type: {
                type: String
            },
            tweetid: {
                type: String
            },
            commentid: {
                type: String
            },
            readed: {
                type: Boolean,
                default: false
            },
            opened: {
                type: Boolean,
                default: false
            },
            verified: {
                type: Boolean
            },
            creationdate: {
                type: Date,
                default: new Date()
            }
        }
    ]
});
module.exports = mongoose.model('Notification', notificationSchema)