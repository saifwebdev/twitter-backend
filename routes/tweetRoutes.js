const express = require('express');
const router = express.Router();
const User = require('../schemas/userSchema');
const Tweet = require('../schemas/tweetSchema');
const Notification = require('../schemas/notificationSchema');
const { verifyLogin } = require('../functions');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');

router.post('/create-tweet', verifyLogin, async (req, res) => {
    try {
        const user = req.user
        const { caption, image } = req.body
        const tweet = new Tweet({
            fullname: user.fullname,
            username: user.username,
            profilepictureurl: user.profilepictureurl,
            verified: user.verified
        })
        if (caption) {
            tweet.caption = caption
        }
        if (image) {
            const image_data = await cloudinary.uploader.upload(image)
            tweet.imageurl = image_data.secure_url
            tweet.imagepublicid = image_data.public_id
        }
        await tweet.save()
        res.json({
            tweet: tweet
        })
    } catch (error) {
        console.log(error)
    }
});
router.post('/get-tweets', verifyLogin, async (req, res) => {
    try {
        const limit = req.body.limit
        const user = req.user
        const following = user.following.map(following => {
            return following.username
        })
        const tweets = await Tweet.find({
            $or: [
                {
                    username: user.username
                },
                {
                    username: {
                        $in: following
                    }
                }
            ]
        }).sort({ _id: -1 }).limit(limit)
        res.json({
            tweets: tweets
        })
    } catch (error) {
        console.log(error)
    }
});
router.post('/like-tweet', verifyLogin, async (req, res) => {
    try {
        const tweetid = req.body.tweetid
        const user = req.user
        const tweet = await Tweet.findOne({ _id: tweetid })
        const _user = await User.findOne({ username: tweet.username })
        const likes = tweet.likes.map(like => {
            return like.username
        })
        if (likes.includes(user.username)) {
            await Tweet.updateOne(
                {
                    _id: tweet._id
                },
                {
                    $pull: {
                        likes: {
                            username: user.username
                        }
                    }
                }
            )
            if (_user.username != user.username) {
                await Notification.updateOne(
                    {
                        username: _user.username
                    },
                    {
                        $pull: {
                            notifications: {
                                username: user.username,
                                type: 'like',
                                tweetid: tweetid
                            }
                        }
                    }
                )
            }
        } else {
            await Tweet.updateOne(
                {
                    _id: tweet.id
                },
                {
                    $push: {
                        likes: {
                            fullname: user.fullname,
                            username: user.username,
                            profilepictureurl: user.profilepictureurl,
                            verified: user.verified
                        }
                    }
                }
            )
            if (_user.username != user.username) {
                await Notification.updateOne(
                    {
                        username: _user.username
                    },
                    {
                        $push: {
                            notifications: {
                                fullname: user.fullname,
                                username: user.username,
                                profilepictureurl: user.profilepictureurl,
                                type: 'like',
                                tweetid: tweet._id,
                                verified: user.verified
                            }
                        }
                    }
                )
            }
        }
        const updatedTweet = await Tweet.findOne({ _id: tweet._id })
        res.json({
            tweet: updatedTweet
        })
    } catch (error) {
        console.log(error)
    }
});
router.post('/delete-tweet', verifyLogin, async (req, res) => {
    try {
        const tweetid = req.body.tweetid
        const user = req.user
        const tweet = await Tweet.findOne({ _id: tweetid })
        await Tweet.findByIdAndDelete(tweet._id)
        if (tweet.imagepublicid) {
            await cloudinary.uploader.destroy(tweet.imagepublicid)
        }
        await Notification.updateOne(
            {
                username: user.username
            },
            {
                $pull: {
                    notifications: {
                        tweetid: tweet._id
                    }
                }
            }
        )
        const notification = await Notification.findOne({ username: user.username })
        const unreadNotifications = notification.notifications.filter(notification => {
            return notification.readed == false
        })
        res.json({
            success: true,
            unreadNotificationsLength: unreadNotifications.length
        })
    } catch (error) {
        console.log(error)
    }
});
router.post('/post-comment', verifyLogin, async (req, res) => {
    try {
        const { tweetid, caption } = req.body
        const user = req.user
        const tweet = await Tweet.findOne({ _id: tweetid })
        const _user = await User.findOne({ username: tweet.username })
        const commentid = new mongoose.Types.ObjectId()
        await Tweet.updateOne(
            {
                _id: tweet._id
            },
            {
                $push: {
                    comments: {
                        _id: commentid,
                        fullname: user.fullname,
                        username: user.username,
                        profilepictureurl: user.profilepictureurl,
                        caption: caption,
                        verified: user.verified
                    }
                }
            }
        )
        if (_user.username != user.username) {
            await Notification.updateOne(
                {
                    username: _user.username
                },
                {
                    $push: {
                        notifications: {
                            fullname: user.fullname,
                            username: user.username,
                            profilepictureurl: user.profilepictureurl,
                            type: 'comment',
                            tweetid: tweet._id,
                            commentid: commentid,
                            verified: user.verified
                        }
                    }
                }
            )
        }
        const updatedTweet = await Tweet.findOne({ _id: tweet._id })
        res.json({
            tweet: updatedTweet
        })
    } catch (error) {
        console.log(error)
    }
});
router.post('/delete-comment', verifyLogin, async (req, res) => {
    try {
        const { tweetid, commentid } = req.body
        const user = req.user
        const tweet = await Tweet.findOne({ _id: tweetid })
        const _user = await User.findOne({ username: tweet.username })
        await Tweet.updateOne(
            {
                _id: tweet._id
            },
            {
                $pull: {
                    comments: {
                        _id: commentid
                    }
                }
            }
        )
        await Notification.updateOne(
            {
                username: _user.username
            },
            {
                $pull: {
                    notifications: {
                        commentid: commentid
                    }
                }
            }
        )
        const updatedTweet = await Tweet.findOne({ _id: tweet._id })
        res.json({
            tweet: updatedTweet
        })
    } catch (error) {
        console.log(error)
    }
});
router.post('/get-tweet', verifyLogin, async (req, res) => {
    try {
        const tweetid = req.body.tweetid
        const tweet = await Tweet.findOne({ _id: tweetid })
        res.json({
            tweet: tweet
        })
    } catch (error) {
        console.log(error)
    }
});
module.exports = router;