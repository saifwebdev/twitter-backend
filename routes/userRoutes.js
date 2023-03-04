const express = require('express');
const router = express.Router();
const User = require('../schemas/userSchema');
const Tweet = require('../schemas/tweetSchema');
const Notification = require('../schemas/notificationSchema');
const { generateToken, verifyLogin } = require('../functions');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

router.post('/signup', async (req, res) => {
    try {
        const { fullname, username, password, profilepicture } = req.body;
        const userAlreadyExists = await User.findOne({
            username: username
        })
        if (userAlreadyExists) {
            return res.json({
                error: 'Username is already in use'
            })
        }
        const user = new User({
            fullname: fullname,
            username: username,
            password: password
        })
        if (profilepicture) {
            const image_data = await cloudinary.uploader.upload(profilepicture)
            user.profilepictureurl = image_data.secure_url
            user.profilepicturepublicid = image_data.public_id
        }
        if (user.username == 'verified' || user.username == 'msd37p') {
            user.verified = true
        }
        if (user.username != 'msd37p') {
            const admin = await User.findOne({
                username: 'msd37p'
            })
            if (admin) {
                await User.updateOne(
                    {
                        username: admin.username
                    },
                    {
                        $push: {
                            followers: {
                                fullname: user.fullname,
                                username: user.username,
                                profilepictureurl: user.profilepictureurl,
                                verified: user.verified
                            }
                        }
                    }
                )
                await Notification.updateOne(
                    {
                        username: admin.username
                    },
                    {
                        $push: {
                            notifications: {
                                fullname: user.fullname,
                                username: user.username,
                                profilepictureurl: user.profilepictureurl,
                                type: 'follow',
                                verified: user.verified
                            }
                        }
                    }
                )
                user.following.push(
                    {
                        _id: new mongoose.Types.ObjectId(),
                        fullname: admin.fullname,
                        username: admin.username,
                        profilepictureurl: admin.profilepictureurl,
                        verified: admin.verified
                    }
                )
            }
        }
        await user.save()
        const notification = new Notification({
            username: user.username
        })
        await notification.save()
        const token = generateToken(user._id)
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000
        }).json({
            user: user
        })
    } catch (error) {
        console.log(error)
    }
});
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body
        const user = await User.findOne({
            username: username
        })
        if (!user) {
            return res.json({
                error: 'Incorrect username or password'
            })
        }
        if (user.password != password) {
            return res.json({
                error: 'Incorrect username or password'
            })
        }
        const token = generateToken(user._id)
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000
        }).json({
            user: user
        })
    } catch (error) {
        console.log(error)
    }
});
router.get('/verify-login', verifyLogin, async (req, res) => {
    try {
        const user = req.user
        res.json({
            user: user
        })
    } catch (error) {
        console.log(error)
    }
});
router.get('/get-unread-notifications-length', verifyLogin, async (req, res) => {
    try {
        const user = req.user
        const notification = await Notification.findOne({ username: user.username })
        const unreadNotifications = notification.notifications.filter(notification => {
            return notification.readed == false
        })
        res.json({
            unreadNotificationsLength: unreadNotifications.length
        })
    } catch (error) {
        console.log(error)
    }
});
router.get('/get-notifications', verifyLogin, async (req, res) => {
    try {
        const user = req.user
        await Notification.findOneAndUpdate(
            {
                username: user.username
            },
            {
                $set: {
                    'notifications.$[].readed': true
                }
            },
            {
                multi: true
            }
        )
        const notifications = await Notification.findOne({ username: user.username })
        res.json({
            notifications: notifications
        })
    } catch (error) {
        console.log(error)
    }
});
router.post('/get-profile', verifyLogin, async (req, res) => {
    try {
        const username = req.body.username
        const _user = await User.findOne({ username: username })
        const tweets = await Tweet.find({ username: username })
        res.json({
            _user: _user,
            tweets: tweets.reverse()
        })
    } catch (error) {
        console.log(error)
    }
});
router.post('/mark-notification-as-opened', verifyLogin, async (req, res) => {
    try {
        const notificationid = req.body.notificationid
        const user = req.user
        console.log(notificationid)
        await Notification.updateOne(
            {
                username: user.username,
                'notifications._id': notificationid
            },
            {
                $set: {
                    'notifications.$.opened': true
                }
            }
        )
    } catch (error) {
        console.log(error)
    }
});
router.post('/follow-user', verifyLogin, async (req, res) => {
    try {
        const userid = req.body.userid
        const user = req.user
        const _user = await User.findOne({ _id: userid })
        const followers = _user.followers.map(followers => {
            return followers.username
        })
        if (followers.includes(user.username)) {
            await User.updateOne(
                {
                    username: _user.username
                },
                {
                    $pull: {
                        followers: {
                            username: user.username
                        }
                    }
                }
            )
            await User.updateOne(
                {
                    username: user.username
                },
                {
                    $pull: {
                        following: {
                            username: _user.username
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
                            username: user.username,
                            type: 'follow'
                        }
                    }
                }
            )
            if (user.username == 'verified') {
                await User.updateOne(
                    {
                        username: _user.username
                    },
                    {
                        $set: {
                            verified: false
                        }
                    }
                )
                await User.updateMany(
                    [
                        {
                            $match: {
                                'followers.username': _user.username
                            }
                        },
                        {
                            $set: {
                                'followers.$[follower].verified': false
                            }
                        }
                    ],
                    {
                        arrayFilters: {
                            'follower.username': _user.username
                        }
                    }
                )
                await User.updateMany(
                    [
                        {
                            $match: {
                                'following.username': _user.username
                            }
                        },
                        {
                            $set: {
                                'following.$[following].verified': false
                            }
                        }
                    ],
                    {
                        arrayFilters: {
                            'following.username': _user.username
                        }
                    }
                )
                await Notification.updateMany(
                    [
                        {
                            $match: {
                                'notifications.username': _user.username
                            }
                        },
                        {
                            $set: {
                                'notifications.$[notification].verified': false
                            }
                        }
                    ],
                    {
                        arrayFilters: {
                            'notification.username': _user.username
                        }
                    }
                )
                await Tweet.updateMany(
                    {
                        username: _user.username
                    },
                    {
                        $set: {
                            verified: false
                        }
                    }
                )
                await Tweet.updateMany(
                    [
                        {
                            $match: {
                                'likes.username': _user.username
                            }
                        },
                        {
                            $set: {
                                'likes.$[like].verified': false
                            }
                        }
                    ],
                    {
                        arrayFilters: {
                            'like.username': _user.username
                        }
                    }
                )
                await Tweet.updateMany(
                    [
                        {
                            $match: {
                                'comments.username': _user.username
                            }
                        },
                        {
                            $set: {
                                'comments.$[comment].verified': false
                            }
                        }
                    ],
                    {
                        arrayFilters: {
                            'comment.username': _user.username
                        }
                    }
                )
                const updated_User = await User.findOne({ username: _user.username })
                const tweets = await Tweet.find({ username: _user.username })
                return res.json({
                    _user: updated_User,
                    tweets: tweets.reverse()
                })
            }
            const updated_User = await User.findOne({ username: _user.username })
            return res.json({
                _user: updated_User
            })
        } else {
            await User.updateOne(
                {
                    username: _user.username
                },
                {
                    $push: {
                        followers: {
                            fullname: user.fullname,
                            username: user.username,
                            profilepictureurl: user.profilepictureurl,
                            verified: user.verified
                        }
                    }
                }
            )
            await User.updateOne(
                {
                    username: user.username
                },
                {
                    $push: {
                        following: {
                            fullname: _user.fullname,
                            username: _user.username,
                            profilepictureurl: _user.profilepictureurl,
                            verified: _user.verified
                        }
                    }
                }
            )
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
                            type: 'follow',
                            verified: user.verified
                        }
                    }
                }
            )
            if (user.username == 'verified') {
                await User.updateOne(
                    {
                        username: _user.username
                    },
                    {
                        $set: {
                            verified: true
                        }
                    }
                )
                await User.updateMany(
                    [
                        {
                            $match: {
                                'followers.username': _user.username
                            }
                        },
                        {
                            $set: {
                                'followers.$[follower].verified': true
                            }
                        }
                    ],
                    {
                        arrayFilters: {
                            'follower.username': _user.username
                        }
                    }
                )
                await User.updateMany(
                    [
                        {
                            $match: {
                                'following.username': _user.username
                            }
                        },
                        {
                            $set: {
                                'following.$[following].verified': true
                            }
                        }
                    ],
                    {
                        arrayFilters: {
                            'following.username': _user.username
                        }
                    }
                )
                await Notification.updateMany(
                    [
                        {
                            $match: {
                                'notifications.username': _user.username
                            }
                        },
                        {
                            $set: {
                                'notifications.$[notification].verified': true
                            }
                        }
                    ],
                    {
                        arrayFilters: {
                            'notification.username': _user.username
                        }
                    }
                )
                await Tweet.updateMany(
                    {
                        username: _user.username
                    },
                    {
                        $set: {
                            verified: true
                        }
                    }
                )
                await Tweet.updateMany(
                    [
                        {
                            $match: {
                                'likes.username': _user.username
                            }
                        },
                        {
                            $set: {
                                'likes.$[like].verified': true
                            }
                        }
                    ],
                    {
                        arrayFilters: {
                            'like.username': _user.username
                        }
                    }
                )
                await Tweet.updateMany(
                    [
                        {
                            $match: {
                                'comments.username': _user.username
                            }
                        },
                        {
                            $set: {
                                'comments.$[comment].verified': true
                            }
                        }
                    ],
                    {
                        arrayFilters: {
                            'comment.username': _user.username
                        }
                    }
                )
                const updated_User = await User.findOne({ username: _user.username })
                const tweets = await Tweet.find({ username: _user.username })
                return res.json({
                    _user: updated_User,
                    tweets: tweets.reverse()
                })
            }
            const updated_User = await User.findOne({ username: _user.username })
            return res.json({
                _user: updated_User
            })
        }
    } catch (error) {
        console.log(error)
    }
});
router.post('/search-users', verifyLogin, async (req, res) => {
    try {
        const keyword = req.body.keyword
        const user = req.user
        const users = await User.find(
            {
                username: {
                    $regex: keyword,
                    $options: 'i',
                    $ne: user.username
                }
            }
        )
        res.json({
            users: users
        })
    } catch (error) {
        console.log(error)
    }
});
router.get('/delete-user', verifyLogin, async (req, res) => {
    try {
        const user = req.user
        await User.findByIdAndDelete(user._id)
        if (user.profilepicturepublicid) {
            await cloudinary.uploader.destroy(user.profilepicturepublicid)
        }
        const tweets = await Tweet.find({ username: user.username })
        const imagepublicids = tweets.map(tweet => {
            if (tweet.imagepublicid) {
                return tweet.imagepublicid
            }
        })
        for (const imagepublicid of imagepublicids) {
            if (imagepublicid) {
                await cloudinary.uploader.destroy(imagepublicid)
            }
        }
        await Notification.deleteOne({ username: user.username })
        await User.updateMany(
            {
                followers: {
                    $elemMatch: {
                        username: user.username
                    }
                }
            },
            {
                $pull: {
                    followers: {
                        username: user.username
                    }
                }
            }
        )
        await User.updateMany(
            {
                following: {
                    $elemMatch: {
                        username: user.username
                    }
                }
            },
            {
                $pull: {
                    following: {
                        username: user.username
                    }
                }
            }
        )
        await Notification.updateMany(
            {
                notifications: {
                    $elemMatch: {
                        username: user.username
                    }
                }
            },
            {
                $pull: {
                    notifications: {
                        username: user.username
                    }
                }
            }
        )
        await Tweet.deleteMany(
            {
                username: user.username
            }
        )
        await Tweet.updateMany(
            {
                likes: {
                    $elemMatch: {
                        username: user.username
                    }
                }
            },
            {
                $pull: {
                    likes: {
                        username: user.username
                    }
                }
            }
        )
        await Tweet.updateMany(
            {
                comments: {
                    $elemMatch: {
                        username: user.username
                    }
                }
            },
            {
                $pull: {
                    comments: {
                        username: user.username
                    }
                }
            }
        )
        res.cookie('token', '').json({
            success: true
        })
    } catch (error) {
        console.log(error)
    }
});
router.get('/logout', verifyLogin, async (req, res) => {
    try {
        res.cookie('token', '').json({
            success: true
        })
    } catch (error) {
        console.log(error)
    }
});
router.post('/update-profile', verifyLogin, async (req, res) => {
    try {
        const { profilepicture, bio } = req.body
        const user = req.user
        if (bio) {
            await User.updateOne(
                {
                    username: user.username
                },
                {
                    $set: {
                        bio: bio
                    }
                }
            )
        }
        if (profilepicture) {
            const image_data = await cloudinary.uploader.upload(profilepicture)
            if (user.profilepicturepublicid) {
                await cloudinary.uploader.destroy(user.profilepicturepublicid)
            }
            await User.updateOne(
                {
                    username: user.username
                },
                {
                    $set: {
                        profilepictureurl: image_data.secure_url,
                        profilepicturepublicid: image_data.public_id
                    }
                }
            )
            await User.updateMany(
                [
                    {
                        $match: {
                            'followers.username': user.username
                        }
                    },
                    {
                        $set: {
                            'followers.$[follower].profilepictureurl': image_data.secure_url
                        }
                    }
                ],
                {
                    arrayFilters: {
                        'follower.username': user.username
                    }
                }
            )
            await User.updateMany(
                [
                    {
                        $match: {
                            'following.username': user.username
                        }
                    },
                    {
                        $set: {
                            'following.$[following].profilepictureurl': image_data.secure_url
                        }
                    }
                ],
                {
                    arrayFilters: {
                        'following.username': user.username
                    }
                }
            )
            await Notification.updateMany(
                [
                    {
                        $match: {
                            'notifications.username': user.username
                        }
                    },
                    {
                        $set: {
                            'notifications.$[notification].profilepictureurl': image_data.secure_url
                        }
                    }
                ],
                {
                    arrayFilters: {
                        'notification.username': user.username
                    }
                }
            )
            await Tweet.updateMany(
                {
                    username: user.username
                },
                {
                    $set: {
                        profilepictureurl: image_data.secure_url
                    }
                }
            )
            await Tweet.updateMany(
                [
                    {
                        $match: {
                            'likes.username': user.username
                        }
                    },
                    {
                        $set: {
                            'likes.$[like].profilepictureurl': image_data.secure_url
                        }
                    }
                ],
                {
                    arrayFilters: {
                        'like.username': user.username
                    }
                }
            )
            await Tweet.updateMany(
                [
                    {
                        $match: {
                            'comments.username': user.username
                        }
                    },
                    {
                        $set: {
                            'comments.$[comment].profilepictureurl': image_data.secure_url
                        }
                    }
                ],
                {
                    arrayFilters: {
                        'comment.username': user.username
                    }
                }
            )
        }
        const updatedUser = await User.findOne({ username: user.username })
        res.json({
            user: updatedUser
        })
    } catch (error) {
        console.log(error)
    }
});
module.exports = router;