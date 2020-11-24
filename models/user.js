var mongoose = require("mongoose");                                         //initialize and create the mongo database
var passportLocalMongoose = require("passport-local-mongoose");             

var userSchema = new mongoose.Schema({                                     //we are define the schema 
    username: String,
    password: String,
    todos: [{

        type: mongoose.Schema.Types.ObjectId,
        ref: "Todo"                                                         //the objects are put in the schema as an array

    }]
});
userSchema.plugin(passportLocalMongoose);                                       
module.exports = mongoose.model("User", userSchema);                        //to export the schema from database and view it in app.js
