const mongoose = require("mongoose");
const express = require("express");
var bodyParser = require("body-parser");
// create application/json parser
var jsonParser = bodyParser.json();
const cors = require("cors");
const app = express();
require("dotenv").config();

const url = process.env.MONGO_URI
const PORT = process.env.PORT || 8080;

const connectionParams = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
mongoose
  .connect(url, connectionParams)
  .then(() => {
    console.log("Connected to the database ");
  })
  .catch((err) => {
    console.error(`Error connecting to the database. n${err}`);
  });
app.use(cors());
app.post("/login", jsonParser, async (req, res) => {
  var query = { stuEmail: req.body.email, pass: req.body.password };
  const result = await User.find(query);
  if (!result || result.length === 0) res.status(400).send({ token: null });
  else {
    require("crypto").randomBytes(48, function (err, buffer) {
      var token = buffer.toString("hex");
      res.send({
        token: token,
        name: result[0].stuName,
        email: result[0].stuEmail,
        dept: result[0].stuDept,
      });
    });
  }
});
app.get("/book/fetch", jsonParser, async (req, res) => {
  var today = new Date();
  var today2 = new Date();
  today.setDate(today.getDate() + 1);
  const date = `${today.getFullYear()}-${("0" + (today.getMonth() + 1)).slice(
    -2
  )}-${("0" + today.getDate()).slice(-2)}`;
  today2.setDate(today2.getDate() - 6);
  const prevDate = `${today2.getFullYear()}-${(
    "0" +
    (today2.getMonth() + 1)
  ).slice(-2)}-${("0" + today2.getDate()).slice(-2)}`;
  const query = {
    createdAt: { $gte: new Date(prevDate), $lte: new Date(date) },
  };
  const result = await BookDetails.find(query);
  if (!result || result.length === 0) res.status(400).send({ token: null });
  else {
    const arr = [];
    result.map((item) => {
      arr.push({ bookingCode: item.bookingCode });
    });
    res.send({ array: arr });
    console.log(arr);
  }
});

app.get("/admin/fetch", jsonParser, async (req, res) => {
  const result = await BookDetails.find({ approved: "no" });
  res.send(result);
});

const tableSchema = {
  userType: String,
  stuName: String,
  stuEmail: String,
  pass: String,
  enrollNo: String,
  stuDept: String,
  stuMobNo: String,
  program: String,
  date: String,
  supName: String,
  supDept: String,
};

const bookSchema = {
  userName: String,
  userEmail: String,
  bookingDate: String,
  createdAt: Date,
  userDept: String,
  slot: String,
  bookingCode: String,
  service: String,
  price: String,
  approved: String,
};

const BookDetails = mongoose.model("BookingDetails", bookSchema);
app.post("/book", jsonParser, function (req, res) {
  console.log(req.body);
  var today = new Date();
  const date = `${today.getFullYear()}-${("0" + (today.getMonth() + 1)).slice(
    -2
  )}-${("0" + today.getDate()).slice(-2)}`;
  const book = new BookDetails({
    userName: req.body.userName,
    userEmail: req.body.userEmail,
    bookingDate: req.body.bookingTime.split("_")[0],
    createdAt: date,
    userDept: req.body.userDept,
    slot: req.body.bookingTime.split("_")[1],
    bookingCode: req.body.bookingTime,
    service: req.body.service,
    price: req.body.price,
    approved: "no",
  });
  book
    .save()
    .then(console.log("success " + book))
    .catch((e) => console.log(e));
});

app.post("/admin/delete", jsonParser, async (req, res) => {
  const result = await BookDetails.deleteOne({ _id: req.body.id });
  res.send(result);
});



const User = mongoose.model("Users", tableSchema);
app.post("/register", jsonParser, function (req, res) {
  console.log(req.body);
  const user = new User({
    userType: req.body.userType,
    stuName: req.body.name,
    stuEmail: req.body.email,
    pass: req.body.pass,
    enrollNo: req.body.enroll,
    stuDept: req.body.dept,
    stuMobNo: req.body.mobile,
    program: req.body.program,
    date: req.body.date,
    supName: req.body.supervisor,
    supDept: req.body.supervisorDept,
  });
  user
    .save()
    .then(console.log("success"))
    .catch((e) => console.log(e));
});

app.listen(PORT, () => console.log("API is running on http://localhost:8080"));
