const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Admin } = require("../src/models/Admin");
// require("dotenv").config({ path: '../src/.env' }); // Adjust path if needed
require("dotenv").config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ DB Connected");

        const email = "bharath@firstbite.com";
        const password = "12345"; // Choose a strong password

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            console.log("Admin user already exists.");
            await mongoose.connection.close();
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        const newAdmin = new Admin({
            name: "Super Admin DBK",
            email: email,
            password: hashedPassword,
            role: "super-admin",
            permissions: ["users", "orders", "menu", "subscriptions", "delivery", "analytics", "settings"]
        });

        await newAdmin.save();
        console.log("🎉 Admin user created successfully!");
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log("   Please change this password after first login!");

        await mongoose.connection.close();
    } catch (error) {
        console.error("❌ Error creating admin:", error);
        process.exit(1);
    }
};

createAdmin().catch(console.error);