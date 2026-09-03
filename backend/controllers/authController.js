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

function forgotPassword(req, res) {
    const { email } = req.body;

    authService
        .requestPasswordReset(email)
        .then(function (result) {
            res.status(200).json(result);
        })
        .catch(function (err) {
            if (err.message === "USER_NOT_FOUND") {
                return res.status(404).json({ message: "No account found with this email address." });
            }
            res.status(400).json({ message: err.message || "Failed to process password reset request." });
        });
}

function verifyResetCode(req, res) {
    const { email, code } = req.body;

    authService
        .verifyResetCode(email, code)
        .then(function (result) {
            res.status(200).json(result);
        })
        .catch(function (err) {
            if (err.message === "INVALID_CODE") {
                return res.status(400).json({ message: "Invalid verification code." });
            }
            if (err.message === "CODE_EXPIRED") {
                return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
            }
            res.status(400).json({ message: err.message });
        });
}

function resetPassword(req, res) {
    const { email, code, newPassword } = req.body;

    authService
        .resetPasswordWithCode(email, code, newPassword)
        .then(function (result) {
            res.status(200).json(result);
        })
        .catch(function (err) {
            if (err.message === "INVALID_CODE") {
                return res.status(400).json({ message: "Invalid verification code." });
            }
            if (err.message === "CODE_EXPIRED") {
                return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
            }
            if (err.message === "PASSWORD_TOO_SHORT") {
                return res.status(400).json({ message: "New password must be at least 6 characters." });
            }
            res.status(400).json({ message: err.message });
        });
}

function resetPasswordByAccountDetails(req, res) {
    const { email, fullName, newPassword } = req.body;

    authService
        .resetPasswordWithAccountDetails(email, fullName, newPassword)
        .then(function (result) {
            res.status(200).json(result);
        })
        .catch(function (err) {
            if (err.message === "USER_NOT_FOUND") {
                return res.status(404).json({ message: "No account found with this email address." });
            }
            if (err.message === "NAME_MISMATCH") {
                return res.status(400).json({ message: "The provided name does not match the registered account name." });
            }
            if (err.message === "PASSWORD_TOO_SHORT") {
                return res.status(400).json({ message: "New password must be at least 6 characters." });
            }
            res.status(400).json({ message: err.message });
        });
}

module.exports = {
    register,
    login,
    getCurrentUser,
    updateProfile,
    getAvatars,
    deleteAccount,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    resetPasswordByAccountDetails
};
