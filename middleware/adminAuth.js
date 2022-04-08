const Users = require("../models/userModel")

const adminAuth = async (req, res, next) => {
    try {
        const user = await Users.findOne({_id: req.user.id})
    } catch(err) {
        return res.status(500).json({msg: err.message})
    }
}

module.exports = adminAuth