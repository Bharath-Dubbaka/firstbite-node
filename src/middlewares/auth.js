// middlewares/auth.js
const admin = require("firebase-admin");
const serviceAccount = require("../config/firebase-service-account.json");

if (!admin.apps.length) {
   admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
   });
}

const verifyFirebaseToken = async (req, res, next) => {
   try {
      // Get the authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
         return res
            .status(401)
            .json({ error: "No authorization header provided" });
      }

      // Extract token from "Bearer <token>" and remove Bearer
      const token = authHeader.split("Bearer ")[1];

      if (!token) {
         return res.status(401).json({ error: "No token provided" });
      }

      // Log first 20 chars for debugging
      console.log("Received token:", token.substring(0, 20) + "...");

      // Verify the Firebase token
      const decoded = await admin.auth().verifyIdToken(token);

      console.log("Token verified successfully for user:", decoded.email);

      req.user = decoded; // Contains uid, email, etc.
      next();
   } catch (err) {
      console.error("Token verification failed:", err.message);
      res.status(403).json({ error: "Unauthorized", details: err.message });
   }
};

module.exports = verifyFirebaseToken;
