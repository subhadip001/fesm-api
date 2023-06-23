const mongoose = require("mongoose");
const express = require("express");
var bodyParser = require("body-parser");
var nodemailer = require("nodemailer");
const cron = require("node-cron");
// create application/json parser
var jsonParser = bodyParser.json();
const cors = require("cors");
const app = express();
require("dotenv").config();

const url = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

var today = new Date();
const date = `${today.getFullYear()}-${("0" + (today.getMonth() + 1)).slice(
  -2
)}-${("0" + today.getDate()).slice(-2)}`;

var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "fesem.iitroorkee@gmail.com",
    pass: "vxmaotuyzbzizznf",
  },
});

cron.schedule("0 0 * * 1", async () => {
  try {
    // Reset bookingsAvailableThisWeek field to 1 for all users
    await User.updateMany({}, { bookingsAvailableThisWeek: 1 });

    console.log("Bookings availability reset for all users.");
  } catch (err) {
    console.error("Error resetting bookings availability:", err);
  }
});

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
app.post("/fesem/login", jsonParser, async (req, res) => {
  var query = { stuEmail: req.body.email, pass: req.body.password };
  if (
    req.body.email === "fesem@admin.iitr" &&
    req.body.password === "@.fesemiitr2023!"
  ) {
    res.send({
      admin: "yes",
    });
  } else {
    const result = await User.find(query);
    if (!result || result.length === 0) res.status(400).send({ token: null });
    else {
      require("crypto").randomBytes(48, function (err, buffer) {
        var token = buffer.toString("hex");

        res.send({
          token: token,
          id: result[0]._id,
          name: result[0].stuName,
          email: result[0].stuEmail,
          dept: result[0].stuDept,
          enrollNo: result[0].enrollNo,
          contactNo: result[0].stuMobNo,
          bookingsAvailableThisWeek: result[0].bookingsAvailableThisWeek,
        });
      });
    }
  }
});

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
  invoiceUrl: String,
};

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
  bookingsAvailableThisWeek: String,
  bookings: [bookSchema],
};

app.get("/fesem/book/fetch", jsonParser, async (req, res) => {
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
  if (!result || result.length === 0) res.send({ token: null });
  else {
    const arr = [];
    result.map((item) => {
      arr.push({ bookingCode: item.bookingCode, userName: item.userName });
    });
    res.send({ array: arr });
  }
});

app.get("/fesem/admin/fetch", jsonParser, async (req, res) => {
  const result = await BookDetails.find();
  res.send(result);
});

app.post("/fesem/report", jsonParser, async function (req, res) {
  const result = await BookDetails.find({ userEmail: req.body.email });
  console.log("success" + req.body.id + result);
  res.send(result);
});

app.post("/fesem/otp", jsonParser, async function (req, res) {
  const email = req.body.email;
  var otp = Math.random();
  otp = otp * 1000000;
  otp = parseInt(otp);
  var mailOptions4 = {
    from: "fesem.iitroorkee@gmail.com",
    to: `${email}`,
    subject: "OTP for Verification!",
    html: `<h1>Your OTP(One Time Password) for email verification</h1>
    <br/><p>Your OTP for email verification is ${otp}.Please do not share this with anyone</p>`,
  };
  transporter.sendMail(mailOptions4, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
  res.send({ otp: otp });
});
const BookDetails = mongoose.model("BookingDetails", bookSchema);

app.post("/fesem/book", jsonParser, async function (req, res) {
  await User.updateOne(
    { _id: req.body.id },
    { $set: { bookingsAvailableThisWeek: 0 } }
  );
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
    .then(() => {
      console.log(book);
    })
    .catch((e) => console.log(e));
  var mailOptions2 = {
    from: "fesem.iitroorkee@gmail.com",
    to: `${req.body.userEmail}`,
    subject: "Booking Done!",
    html: `<h1>Succesfully booked the slot ${
      req.body.bookingTime.split("_")[1]
    } on ${
      req.body.bookingTime.split("_")[0]
    }</h1><br/><p>Your booking has been done. Please do the payment as soon as you are notified by the office</p>`,
  };
  var pri = req.body.price;
  var x = "no";
  if (pri == 75 || pri == 125) {
    x = "yes";
  }
  var mailOptions3 = {
    from: "fesem.iitroorkee@gmail.com",
    to: `mnhacker2001@gmail.com`,
    subject: "Booking Done!",
    html: `<h1>User ${req.body.userName} succesfully booked the slot on ${
      req.body.bookingTime.split("_")[0]
    }</h1><br/><p>Details</p><br/><p>Email : ${
      req.body.userEmail
    }</p><br/><p>Service : ${
      req.body.service
    }</p><br/><p>Coating: ${x}</p><br/><p>Dept : ${
      req.body.userDept
    }</p><br/><p>Price: ${pri}</p><br/><p>Booking Done At: : ${date}</p>`,
  };
  if (req.body.userName !== "admin") {
    transporter.sendMail(mailOptions2, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
    transporter.sendMail(mailOptions3, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  }
});

app.post("/fesem/admin/delete", jsonParser, async (req, res) => {
  const result = await BookDetails.deleteOne({ _id: req.body.id });
  res.send(result);
});

const User = mongoose.model("Users", tableSchema);
app.post("/fesem/register", jsonParser, async function (req, res) {
  const result = await User.find({ stuEmail: req.body.email });
  console.log(result);
  if (result.length !== 0) {
    return res.status(400).send({
      message: "This is an error!",
    });
  } else {
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
      bookingsAvailableThisWeek: 1,
    });
    user
      .save()
      .then(console.log("success"))
      .catch((e) => console.log(e));
    var mailOptions = {
      from: "fesem.iitroorkee@gmail.com",
      to: "fesem.iitroorkee@gmail.com,mnhacker2001@gmail.com",
      subject: "New Registration!",
      html: `<h1>A new user has been registered</h1><br/><p>User Name : ${req.body.name}</p><br/><p>Email : ${req.body.email}</p><br/><p>Enroll No : ${req.body.enroll}</p><br/><p>Dept : ${req.body.userType}</p><br/><p>Contact No. : ${req.body.mobile}</p>`,
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  }
});

app.post("/fesem/addInvoice", jsonParser, async function (req, res) {
  const { userEmail, bookingTime, invoiceUrl } = req.body;

  try {
    await BookDetails.updateOne(
      { userEmail, bookingCode: bookingTime },
      { $set: { invoiceUrl } }
    );
    const bookingDetails = await BookDetails.findOne({
      userEmail,
      bookingCode: bookingTime,
    });

    console.log(bookingDetails);

    const user = await User.findOne({ stuEmail: userEmail });

    user.bookings.push(bookingDetails);

    console.log(user);
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error" });
  }
  var mailOptions2 = {
    from: "fesem.iitroorkee@gmail.com",
    to: userEmail,
    subject: "Booking Done!",
    html: `<p> You have successfully booked the slot on ${bookingTime.split("_")[0]} . Please pay the required charges as soon as you are notified. Reciept is attached for your reference`,
    attachments: [
      {   
          filename: 'invoice.pdf',
          path : invoiceUrl
      },
    ]
  };
  if (req.body.userName !== "admin") {
    transporter.sendMail(mailOptions2, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  }
  
});

app.listen(PORT, () => console.log("API is running on port " + PORT));

//vxmaotuyzbzizznf
