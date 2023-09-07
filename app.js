const http = require("http");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { DataSource } = require("typeorm");
const bcrypt = require("bcrypt");

dotenv.config();

const myDataSource = new DataSource({
  type: process.env.TYPEORM_CONNECTION,
  host: process.env.TYPEORM_HOST,
  port: process.env.TYPEORM_PORT,
  username: process.env.TYPEORM_USERNAME,
  password: process.env.TYPEORM_PASSWORD,
  database: process.env.TYPEORM_DATABASE
});

myDataSource.initialize().then(() => console.log("Data Source has been initialized!"));

const app = express();

app.use(cors());
app.use(express.json());

const signUp = async (req, res) => {
  try {
    const { name, email, profileImage = "기본 이미지", password } = req.body;

    if (!name || !email || !password) {
      const error = new Error("KEY_ERROR");
      error.status = 400;
      throw error;
    }

    if (password.length < 8) {
      const error = new Error("INVALID_PASSWORD");
      error.status = 400;
      throw error;
    }

    const [existingUser] = await myDataSource.query(`SELECT email FROM users WHERE email = '${email}'`);
    if (existingUser) {
      const error = new Error("DUPLICATED_EMAIL_ADDRESS");
      error.status = 400;
      throw error;
    }

    const hasSpecialChar = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/g;
    if (!hasSpecialChar.test(password)) {
      const error = new Error("NO_SPECIAL_CHARACTERS");
      error.status = 400;
      throw error;
    }

    const encryptedPw = bcrypt.hashSync(password, 2);

    await myDataSource.query(
      `INSERT INTO users (name, email,profile_image, password) VALUES ('${name}', '${email}', '${profileImage}', '${encryptedPw}')`
    );

    return res.status(201).json({ message: "USER_CREATED" });
  } catch (error) {
    console.log(error);
    return res.status(error.status).json({ message: error.message });
  }
};

app.post("/sign-up", signUp);

const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error("KEY_ERROR");
      error.status = 400;
      throw error;
    }

    const [existingUser] = await myDataSource.query(`SELECT password FROM users WHERE email = '${email}'`);
    if (!existingUser) {
      const error = new Error("ACCOUNT_DOES_NOT_EXIST");
      error.status = 404;
      throw error;
    }

    if (!bcrypt.compareSync(password, existingUser.password)) {
      const error = new Error("PASSWORD_DOES_NOT_MATCH");
      error.status = 400;
      throw error;
    }

    const token = jwt.sign({ id: email }, process.env.SECRET_KEY);

    return res.status(200).json({
      message: "LOGIN_SUCCESS",
      accessToken: token
    });
  } catch (error) {
    console.log(error);
    return res.status(error.status).json({ message: error.message });
  }
};

app.post("/sign-in", signIn);

const server = http.createServer(app);

const start = async () => {
  try {
    server.listen(8000);
  } catch (error) {
    console.log(error);
  }
};

start();
