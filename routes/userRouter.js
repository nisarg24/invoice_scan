const router = require('express').Router()
const userCtrl = require('../controllers/userCtrl')
const auth = require('../middleware/auth')
const adminAuth = require('../middleware/adminAuth')

router.post('/register', userCtrl.register);
router.post('/activation', userCtrl.activateEmail)
router.post('/login', userCtrl.login)
router.post('/refresh_token', userCtrl.getAccessToken)
router.post('/forgot', userCtrl.forgotPassword)
router.post('/reset', auth, userCtrl.resetPassword)
router.get('/info', auth, userCtrl.getUserInfo)
router.get('/all', auth, adminAuth, userCtrl.getAllUserInfo)

module.exports = router