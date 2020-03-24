const mongoose = require("mongoose");
const dbURI = global.__MONGO_URI__ || "mongodb://localhost:27017/template";

mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log(`MongoDB connected: ${dbURI}`);
});