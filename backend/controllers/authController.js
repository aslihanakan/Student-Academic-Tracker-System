const authService = require("../services/authService");

function register(req, res) {
    const { name, email, password, gradeLevel, department, avatar } = req.body;

    authService
        .registerUser(name, email, password, gradeLevel, department, avatar)
        .then(function (result) {
            res.status(201).json(result);
        })
        .catch(function (err) {
            if (err.message === "EMAIL_ALREADY_EXISTS") {
                return res.status(400).json({ message: "This email is already registered." });
            }
            res.status(400).json({ message: err.message });
        });
}

function login(req, res) {
    const { email, password } = req.body;

    authService
        .loginUser(email, password)
        .then(function (result) {
            res.status(200).json(result);
        })
        .catch(function (err) {
            if (err.message === "INVALID_CREDENTIALS") {
                return res.status(401).json({ message: "Invalid email or password." });
            }
            res.status(500).json({ message: err.message });
        });
}

function getCurrentUser(req, res) {
    authService
        .findUserById(req.userId)
        .then(function (user) {
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }
            res.status(200).json(user);
        })
        .catch(function (err) {
            res.status(500).json({ message: err.message });
        });
}

function updateProfile(req, res) {
    const { name, email, gradeLevel, department, avatar, currentPassword, newPassword } = req.body;

    authService
        .updateUserProfile(req.userId, {
            name,
            email,
            gradeLevel,
            department,
            avatar,
            currentPassword,
            newPassword
        })
        .then(function (updatedUser) {
            res.status(200).json(updatedUser);
        })
        .catch(function (err) {
            if (err.message === "EMAIL_ALREADY_EXISTS") {
                return res.status(400).json({ message: "This email is already in use by another account." });
            }
            if (err.message === "USER_NOT_FOUND") {
                return res.status(404).json({ message: "User not found." });
            }
            res.status(400).json({ message: err.message });
        });
}

function getAvatars(req, res) {
    const avatars = authService.getAvailableAvatars();
    res.status(200).json(avatars);
}

function deleteAccount(req, res) {
    authService
        .deleteUserAccount(req.userId)
        .then(function (result) {
            res.status(200).json(result);
        })
        .catch(function (err) {
            if (err.message === "USER_NOT_FOUND") {
                return res.status(404).json({ message: "User not found." });
            }
            res.status(500).json({ message: err.message });
        });
}

module.exports = {
    register,
    login,
    getCurrentUser,
    updateProfile,
    getAvatars,
    deleteAccount
};
