const express = require("express");
const { connectDB } = require("./config/database");
const app = express();
const cookieParser = require("cookie-parser");

const cors = require("cors");

app.use(express.json());
app.use(cookieParser());
app.use(
   cors({
      origin: "http://localhost:5173",
      credentials: true,
   })
);

app.get("/test", async (req, res) => {
   try {
      console.log("GET feed called", req.body);

      res.send("sucess");
   } catch (error) {
      res.status(400).send("NOT success :::" + error.message);
      console.log("delete NOT done", error.message);
   }
});

connectDB()
   .then(() => {
      console.log("connection to clusterDB successful");
      app.listen(9999, () => {
         console.log("express Server is up and running on port 9999");
      });
   })
   .catch((err) => {
      console.error("connection to clusterDB failed", err);
   });
