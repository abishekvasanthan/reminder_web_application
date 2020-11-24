var express = require("express");           //url routes
var app = express();
const fs = require('fs');                   //file stream to upload in the s3 bucket
var mongoose = require("mongoose");         //to connect to the mongo
var bodyParser = require("body-parser");    //to retrieve data from the post method
var methodOverride = require("method-override");
var passport = require("passport");         //to create the token session
var LocalStrategy = require("passport-local");
var User = require("./models/user");
var Todo = require("./models/todo");
const AWS = require('aws-sdk');             //to upload the file in s3 bucket
AWS.config.update({
    accessKeyId: 'ASIA5EUF3N2CAX472UNT',
    secretAccessKey: '1gAQd9QD3mVSDq4XcB/pVuBACvVxQtmgcbO9fNQV',
    sessionToken: 'FwoGZXIvYXdzENL//////////wEaDJU51Mjd2EPj/hITeCLWAd5Z9sxkxzLq2GPOi7/n0Ol7RCiarl9mq2Pqb92CMHkRVX+VHglhsTyad4oTReE2HQHH1l5kOzKAZF/bDIY5wM8aiXMRRe6r7Pxap/yuEEyQqS+8rjLKkgVmnYs5kraCPvGXHGbQC20uYgsPhu9F9PVEhwdZeC9xmOOd8e+f1DaAALx6+JdGebPkEOlZaGQWWoBkCOekM+QnQ/irfZq0eb0UOIxmAJlt76XGJfVkK52Sv80eEm1KX3U4DkwPY+C1MCogVaPCrdkouHRZIOohyJEGdz3SIsEovqyZ/QUyLZK6GT0XDxz5Z/jKKswr5WPb0d7iCiY+1XXnxkEbCaw3VuV2RpYKWPVqI4yllQ==',
    region: 'us-east-1'
});
const multer = require('multer');           //to extract the file sent through the post method
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {   //destination is  the place where the file is to be stored
            cb(null, 'uploads/images');       //its a configuration
        },
        filename: (req, file, cb) => {          
            const name = (file.originalname);   //file is stored in uploads
            cb(null, name);
        }
    })
});
var s3bucket = new AWS.S3();                
var flash = require("connect-flash");       //flash message like succesfully logged in and logged out
app.use(flash());
app.use(methodOverride("_method"));

mongoose.connect("mongodb://localhost/todoapp", { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false });//connect to mongo
app.set("view engine", "ejs");                                  //to use the html files in the views
app.use(bodyParser.urlencoded({ extended: true }));             
app.use(express.static("public"));
app.use('/uploads', express.static("uploads"));
app.use(require("express-session")({                            //to use the package to create the session by initializing it
    secret: "CLoud Case Study",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());                                 //to initialize the token session
app.use(passport.session());                                    //create the token session
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());               //we create a hashed token for the user


app.get("/", function(req, res) {
    res.redirect("/todos");                                     //displays the login screen
})

app.get("/todos", isLoggedIn, function(req, res) {              //isLoggedIn is a middleware which checks whether any user is logged in or not
    currentUser = req.user;                                     //middleware definition is present at the end
    var msg = String(req.flash("Success"));                     //if user is logged in a flash msg is dispayed
    console.log(msg);                                           
    console.log(msg.length);
    User.findById(req.user).populate("todos").exec(function(err, foundUser) {       //we populate all the todos to the index.ejs file
        if (err) {
            console.log("Problem in Home Page Showing");                            //
        } else {
            var todos = foundUser.todos;
            console.log(todos);
            res.render("index", { foundUser: foundUser, currentUser: currentUser, msg: msg });  //it renders the todos to the index.ejs
        }
    })

});
app.get("/todos/new", isLoggedIn, function(req, res) {
    currentUser = req.user;
    var msg = String(req.flash("error"));                           //to create a new todo form which is present in the new.ejs
    console.log(msg);
    console.log(msg.length);
    res.render("new", { currentUser: currentUser, msg: msg });
});

app.post("/todos", isLoggedIn, upload.single('photo'), async function(req, res) {       //inserting the todo in the table after creation
    var currentUser = req.user;                         
    if (req.file) {                                 //only if the file is present                                                      

        console.log(req.file);                      //to upload the file in s3
        console.log(req.file.filename);
        console.log(req.file.destination);
        var image = "https://aswanth2000cloud.s3.amazonaws.com/" + req.user.username + "-" + req.file.filename; //url of the image
        console.log(image);                         

        var params = {
            Bucket: 'aswanth2000cloud',
            Key: `${currentUser.username}-${req.file.filename}`,   //configurations of the bucket  //key is the filename uploaded in the bucket
            Body: fs.createReadStream(req.file.path),               //file is ready and the contents are stored in the body
            ACL: 'public-read'                  //access control list 
        };
        await s3bucket.putObject(params, function(err, data) {          //putobj uploads the file in s3
            if (err) {                                          //contains all the details of the file
                return console.log("Error storing picture");
            } else {
                return console.log("Successfully stored Todo details!");
            }
        });


    }
    var newPost = { title: req.body.todo.title, image: image, body: req.body.todo.body, date: req.body.todo.date, time: req.body.todo.time }
        //req.body.todo.title is the 

    await User.findById(req.user, async function(err1, foundUser) {     //we find the user by id 
        if (err1) {
            console.log('Error while retrieving user');
        } else {
            await Todo.create(newPost, async function(err, newTodo) {   //we create the todo obj and then link it with newpost
                if (err) {
                    console.log("Error in Creation!");
                } else {
                    await foundUser.todos.push(newTodo);    //we push the references of newTodo in todos array
                    await foundUser.save();         //then we save the 
                    res.redirect("/todos");         //we redirect to the home page
                }
            });
        }

    });




});
app.get("/todos/:id", isLoggedIn, function(req, res) {          //each todo has an id. with that id we get the details of the todo
    currentUser = req.user;                 
    var msg = String(req.flash("error"));
    console.log(msg);
    console.log(msg.length);
    // res.send("Show Page");
    Todo.findById(req.params.id, function(err, foundTodo) {     //req.params.id has the id of the todo
        if (err) {
            console.log("Error in showig specific todo!");
        } else {
            res.render("show", { foundTodo: foundTodo, currentUser: currentUser, msg: msg });       //now we display the todo 
        }
    });

});

app.get("/todos/:id/edit", isLoggedIn, function(req, res) {     // now to edit any todo
    currentUser = req.user;
    Todo.findById(req.params.id, function(err, editTodo) {
        if (err) {
            console.log("Error in Showing Edit Form!");
        } else {
            res.render("edit", { editTodo: editTodo, currentUser: currentUser });   //we render the todo to the edit.ejs
        }
    })


});

app.put("/todos/:id", isLoggedIn, upload.single('photo'), async function(req, res) {        //after edit the todo, to store it back
    currentUser = req.user;
    console.log(req.body);
    if (req.file) {

        console.log(req.file);
        console.log(req.file.filename);         //after modifying the todo, it stores the todo to the desired location
        console.log(req.file.destination);
        var image = "https://aswanth2000cloud.s3.amazonaws.com/" + req.user.username + "-" + req.file.filename;
        console.log(image);

        var params = {
            Bucket: 'aswanth2000cloud',
            Key: `${currentUser.username}-${req.file.filename}`,    //bucket configurations
            Body: fs.createReadStream(req.file.path),
            ACL: 'public-read'
        };
        await s3bucket.putObject(params, function(err, data) {          
            if (err) {
                return console.log("Error storing picture");
            } else {
                return console.log("Successfully stored Todo details!");
            }
        });

    }
    var updatedPost = { title: req.body.todo.title, image: image, body: req.body.todo.body };
    //res.send("Post Updated!");
    Todo.findByIdAndUpdate(req.params.id, updatedPost, function(err, updateTodo) {
        if (err) {
            console.log("Error in Updating!");
        } else {    
            res.redirect("/todos/" + req.params.id);                    //we update the todo 
        }
    });

});

app.delete("/todos/:id", isLoggedIn, function(req, res) {       //todos/:id has the id of the todo
    currentUser = req.user;
    //res.send("Delete Page!!");
    Todo.findByIdAndDelete(req.params.id, function(err) {       //inbuilt function
        if (err) {
            console.log("Error in Deleting!");
        } else {
            res.redirect("/todos");
        }
    })
});

//======AUTH
app.get("/register", function(req, res) {           //an error message for the below function
    var msg = String(req.flash("error"));
    console.log(msg);
    console.log(msg.length);
    res.render("register", { msg, msg });
});

app.post("/register", async function(req, res) {
    var newUser = new User({ username: req.body.username });
    await User.register(newUser, req.body.password, async function(err, user) {     //an user is created in the user table
        if (err) {
            console.log(err);                               
            req.flash("error", err.message);
            return res.redirect("/register");           
        }
        await passport.authenticate("local")(req, res, function() {             //inbuilt function to create the token
            req.flash("Success", "Successfully Signed Up! Nice to meet you " + req.body.username);      //each and every user has a unique token id 
            res.redirect("/todos");
        });
    });
});

app.get("/login", function(req, res) {      //displays the login page in case of an error
    var msg = String(req.flash("error"));
    console.log(msg);
    console.log(msg.length);                
    res.render("login", { msg, msg });
});

app.post("/login", passport.authenticate("local", {         //automatically logins the user if a avalid user is available
    successRedirect: "/todos",
    failureRedirect: "/login",
    failureFlash: true              //automatically sends an error message
}), function(req, res) {});

app.get("/logout", function(req, res) {                 //to logout of the page
    req.logOut();
    req.flash("Success", "Successfully,Logged out!!")
    res.redirect("/todos");
});

function isLoggedIn(req, res, next) {               //in case a valid user is present, the control goes to the next function
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "Please Login First!");      //or else displays an error message 
    res.redirect("/login");
}


app.listen(3000, function() {
    console.log("Todo App UP!");
});