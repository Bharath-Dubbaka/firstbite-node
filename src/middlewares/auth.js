    // middleware/auth.js
    const admin = require("../config/firebase-admin");
    const { User } = require("../models/User");

    const verifyFirebaseToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "No token provided or invalid format",
            });
        }

        const idToken = authHeader.split("Bearer ")[1];

        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Find user in database
        const user = await User.findOne({ firebaseUID: decodedToken.uid });

        if (!user) {
            return res.status(401).json({
                error: "User not found",
            });
        }

        req.user = decodedToken;
        req.dbUser = user;
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({
            error: "Invalid or expired token",
        });
    }
    };

    module.exports = { verifyFirebaseToken };
