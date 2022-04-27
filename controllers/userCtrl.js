const Users = require('../models/userModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const sendMail = require('./sendMail')

const {CLIENT_URL} = process.env 

const userCtrl = {
    register: async (req, res) => {
        try{
            const {name, email, password} = req.body
            
            if (!name || !email || !password)
                return res.status(400).json({msg: "Please fill in all fields"})

            if (!validateEmail(email))
                return res.status(400).json({msg: "Please enter valid email"})

            const user = await Users.findOne({email})
            if (user) return res.status(400).json({msg: "Email is already exist"})

            if (password.length < 6)
                return res.status(400).json({msg: "Password must be at least 6 characters"})

            const passwordHash = await bcrypt.hash(password, 12)
            
            const newUser = {
                name, email, password: passwordHash
            }

            const activationToken = createActivationToken(newUser)

            const url = `${CLIENT_URL}/user/activate/${activationToken}`

            sendMail(email, url)
            
            res.json({msg: "Register success! Please activate your email to start"})
        } catch(err) {
            return res.status(500).json({msg: err.message})
        }
    },
    activateEmail: async (req, res) => {
        try {
            const {activation_token} = req.body
            const user = jwt.verify(activation_token, process.env.ACTIVATION_TOKEN_SECRET)

            const {name, email, password} = user

            const check = await Users.findOne({email})
            if (check)
                return res.status(400).json({msg: "This email is already exist."})

            const newUser = new Users({
                name, email, password
            })

            await newUser.save()

            res.json({msg: "Account has been activated!"})

        } catch(err) {
            return res.status(500).json({msg: err.message})
        }
    },
    login: async (req, res) => {
        try {
            const {email, password} = req.body
            const user = await Users.findOne({email})

            if (!user)
                return res.status(400).json({msg: "This email does not exist."})

            const isMatch = await bcrypt.compare(password, user.password)
            if (!isMatch)
                return res.status(400).json({msg: "Password is incorrect."})

            const refresh_token = createRefreshToken({id: user._id})

            res.cookie('refreshtoken', refresh_token, {
                httpOnly: true,
                path: '/user/refresh_token',
                maxAge: 7*24*60*60*1000 // 7 days
            })

            res.json({msg: "Login success!"})

        } catch(err) {
            return res.status(500).json({msg: err.message})
        }
    },
    getAccessToken: (req, res) => {
        try {
            const rf_token = req.cookies.refreshtoken
            if (!rf_token)
                return res.status(400).json({msg: "Please login now!"})

            jwt.verify(rf_token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
                if (err)
                    return res.status(400).json({msg: "Please login now!"})

                const access_token = createAccessToken({id: user.id})

                res.json({access_token})
            })
            
        } catch(err) {
            return res.status(500).json({msg: err.message})
        }
    },
    forgotPassword: async (req, res) => {
        try {
            const {email} = req.body
            const user = await Users.findOne({email})
            if(!user)
                return res.status(400).json({msg: 'This email does not exist.'})

            const access_token = createAccessToken({id: user._id})
            const url = `${CLIENT_URL}/user/reset/${access_token}`
            sendMail(email, url)
            res.json({msg: "Re-send the password, Please check your email"})
        } catch(err) {
            return res.status(500).json({msg: err.message})
        }
    },
    resetPassword: async (req, res) => {
        try {
            const {password} = req.body
            const passwordHash = await bcrypt.hash(password, 12)

            await Users.findOneAndUpdate({_id: req.user.id}, {
                password: passwordHash
            })
            res.json({msg: "Password successfully changed!"})
        } catch(err) {
            return res.status(500).json({msg: err.message})
        }
    },
    getUserInfo: async (req, res) => {
        try {
            const user = await Users.findById(req.user.id).select('-password')

            res.json(user)
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    getAllUserInfo: async (req, res) => {
        try {
            // console.log(req)
            const users = await Users.find().select('-password')
            return res.json(users)
        } catch(err) {
            return res.status(500).json({msg: err.message})
        }
    },
    logout: async (req, res) => {
        try {
            res.clearCookie('refreshtoken', {path: 'user/refresh_token'})
            return res.json({msg: "Logged out."})
        } catch(err) {
            return res.status(500).json({msg: err.message})
        }
    },
    updateUser: async (req, res) => {
        try {
            const {name, avatar} = req.body
            await Users.findOneAndUpdate({_id: req.user.id}, {
                name, avatar
            })
            return res.json({msg: "Updated successfully!"})
        } catch(err) {
            return res.status(500).json({msg: err.message})
        }
    },
    updateRole: async (req, res) => {
        try {
            const {role} = req.body
            // console.log(req.user.id)
            await Users.findOneAndUpdate({_id: req.user.id}, {
                role
            })
            return res.json({msg: "Update role!"})
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    }
}

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(email);
}

const createActivationToken = (payload) => {
    return jwt.sign(payload, process.env.ACTIVATION_TOKEN_SECRET, {expiresIn : '5m'})
}

const createAccessToken = (payload) => {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '15m'})
}

const createRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '7d'})
}

module.exports = userCtrl