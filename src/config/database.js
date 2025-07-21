const mongoose = require("mongoose");

const connectDB = async () => {
   //    const dbName = "devTinder";
   const uri =
      "mongodb+srv://bharathdubbaka39:mWoHabZonIDorOiK@resumeonflycluster.bdlzhop.mongodb.net/firstbiteDB";
   //    await mongoose.connect(uri);

   await mongoose.connect(uri);
};

module.exports = { connectDB };
