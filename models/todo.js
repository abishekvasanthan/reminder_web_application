var mongoose = require("mongoose");                 

var todoSchema = new mongoose.Schema({                          //we are creating the schema
    title: String,
    image: String,
    body: String,
    date: String,
    time: String,
    created: { type: Date, default: Date(Date.now()) },

});

module.exports = mongoose.model("Todo", todoSchema);            //we export the schema to app.js