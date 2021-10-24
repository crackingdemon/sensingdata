const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const port = process.env.PORT || 3000;
const app = express();
const axios = require("axios");
require("dotenv").config();
const JWT_SECRET = process.env.jwt;
const bcrypt = require("bcryptjs");
const { cloneWith } = require("lodash");
const salt = 10;

app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(cookieParser());
app.use(express.static("public"));

app.listen(port, () => {
  console.log(`Running on port ${port}`);
});

// making connnection with our database
mongoose.connect(process.env.mongodb, {
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

//  schema for user auth
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    polygon_id:[],
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema);

// veryfying the token
const verifyToken = (token) => {
  try {
    const verify = jwt.verify(token, JWT_SECRET);
    if (verify.type === "user") {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(JSON.stringify(error), "error");
    return false;
  }
};


// user login function
const verifyUserLogin = async (email, password) => {
  try {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return { status: "error", error: "user not found" };
    }
    if (await bcrypt.compare(password, user.password)) {
      // creating a token
      token = jwt.sign(
        { id: user._id, username: user.email, type: "user" },
        JWT_SECRET
      );
      return { status: "ok", data: token };
    }
    return { status: "error", error: "invalid password" };
  } catch (error) {
    console.log(error);
    return { status: "error", error: "timed out" };
  }
};

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

app.get("/", async (req, res) => {
  const { token } = req.cookies;
  if (verifyToken(token)) {
    const verify = jwt.verify(token, JWT_SECRET);
    try {
      res.render("temp");
    } catch (error) {
      return res.json({
        status: "error",
        error: "data took too long to fetch try again",
      });
    }
  } else {
    res.redirect("/login");
  }
});

// user dashboard portal

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const response = await verifyUserLogin(email, password);
  console.log(response);
  if (response.status === "ok") {
    res.cookie("token", token, { maxAge: 2 * 60 * 60 * 1000, httpOnly: true }); // maxAge: 2 hours
    res.redirect("/");
  } else {
    res.json(response);
  }
});

app.get("/satellitedata",async (req,res)=>{
  const { token } = req.cookies;
  if (verifyToken(token)) {
    const verify = jwt.verify(token, JWT_SECRET);
    // console.log(verify);
    const email=verify.username;
    await User.findOne({ email },(err,user)=>{
      console.log(user.polygon_id);

      res.render("satellite",{data:user.polygon_id});
      // const sendGetRequest = async () => {
      //   try {
      //     const resp = await axios.get(
      //       `https://api.agromonitoring.com/agro/1.0/weather?lat=35&lon=139&appid=e35e69e27372bad71bc64a7d7f42c9f2`
      //     );
      //     console.log(resp.data.weather[0].main);
      //   } catch (err) {
      //     console.error(err);
      //   }
      // };
      
      // sendGetRequest();
    });
  }
})


app.get("/weatherdata",async (req,res)=>{
  const { token } = req.cookies;
  if (verifyToken(token)) {
    const verify = jwt.verify(token, JWT_SECRET);
    // console.log(verify);
    const email=verify.username;
    await User.findOne({ email },(err,user)=>{
      console.log(user.polygon_id);

      res.render("weather")
      // const sendGetRequest = async () => {
      //   try {
      //     const resp = await axios.get(
      //       `https://api.agromonitoring.com/agro/1.0/weather?lat=35&lon=139&appid=e35e69e27372bad71bc64a7d7f42c9f2`
      //     );
      //     console.log(resp.data.weather[0].main);
      //   } catch (err) {
      //     console.error(err);
      //   }
      // };
      
      // sendGetRequest();

    });
  }
})

// code for registering a user

app.post("/signup", async (req, res) => {
  const { email, password: plainTextPassword } = req.body;
  const password = await bcrypt.hash(plainTextPassword, salt);
  if (password.length < 5) {
    return res.json({ status: "error", error: "password to small" });
  }
  try {
    const response = await User.create({
      email,
      password,
    });
    console.log(response);
    res.redirect("/");
  } catch (error) {
    console.log(JSON.stringify(error));
    if (error.code === 11000) {
      res.json({ status: "error", error: "email already exists" });
    }
    throw error;
  }
});

app.post("/polygondata",async (req,res)=>{
  console.log(req.body);
  const { token } = req.cookies;
  if (verifyToken(token)) {
    const verify = jwt.verify(token, JWT_SECRET);
    // console.log(verify);
    const email=verify.username;
    await User.findOne({ email },(err,user)=>{
      user.polygon_id.push(req.body.id);
      user.save((err) => {
        if (err) {
          throw err;
        } else {
          return res.json({ status: "ok", data: "saved sucessfully" });
        }
      });
      console.log(user);
    });
  }
});