const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserService = require("../services/userService");
const UserController = require("./userController");
const { sendEmail } = require("../services/mailService");
const JWT_SECRET = process.env.JWT_SECRET;

class AuthController {
    static async register(req, res) {
        try {
            const { name, email, password, role } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({ message: "Name, email, and password are required" });
            }

            const existingUser = await UserService.getUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: "User already exists" });
            }

            //const hashedPassword = await bcrypt.hash(password, 10);

            const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });

            const newUser = await UserService.createUser({
                name,
                email,
                password,
                role: role ,
                token: token,
            });

            if (!newUser) {
                return res.status(500).json({ message: "Error creating user" });
            }
            await sendEmail(
                email,
                "Welcome to Our App",
                `Hello ${name}, welcome to our platform!`,
                `<h1>Hello ${name}</h1><p>Welcome to our platform!</p>`
            );
            return res.status(201).json({
                message: "User registered successfully",
                token,
                user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
            });

        } catch (error) {
            console.error("Registration error:", error);
            return res.status(500).json({ message: "Internal Server Error", error: error.message });
        }
    }



    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required" });
            }

            if (!JWT_SECRET) {
                console.error("JWT_SECRET is not defined!");
                return res.status(500).json({ message: "Server configuration error" });
            }

            const user = await UserService.getUserByEmail(email);
            console.log("User found:", user);

            if (!user) return res.status(401).json({ message: "Invalid credentials" });
            if (!user.isActivated) {
                return res.status(403).json({ message: "Account is not activated" });
            }
            console.log("Stored Hash:", user.password);
            console.log("Entered Password:", password);

            const isMatch = await bcrypt.compare(password, user.password);
            console.log("Password Match:", isMatch);

            if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

            const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

            console.log("Generated Token:", token);

            res.json({
                message: "Login successful",
                token,
                user: { id: user._id, name: user.name, email: user.email, role: user.role }
            });
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

}

module.exports = AuthController;
