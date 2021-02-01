require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose  = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate")


const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: process.env.ENC_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://admin-10:xyz@cluster0.ywbwq.mongodb.net/blogDB", { 
    useNewUrlParser: true, 
    useCreateIndex: true, 
    useUnifiedTopology: true, 
    useFindAndModify: false
}); 
mongoose.set("useFindAndModify", false);

const userSchema = new mongoose.Schema({

	username: {type: String, unique:true},
	password: {type: String},
	provider: {type: String},
	googleId: {type: String},
	blogData: [{
        title: String,
        body: String
    }]
});
    
userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });
     
    passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
      function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate(
          { username: profile.id },
          {
            provider: "google",
            email: profile._json.email
          },
          function (err, user) {
              return cb(err, user);
          }
        );
    }
));


app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
  );


app.get("/auth/google/home", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/home");
  });


app.route("/")
.get(function(req, res) {
    res.render("login");

  
}); 

app.route("/home")
.get(function(req, res) {
  if (req.isAuthenticated()) {
    res.render("home", {
      homeStartingContent: homeStartingContent,
      posts: req.user.blogData
    });
  }else {
    res.redirect("/home");
  }


}); 

app.route("/login")
.get(function(req, res) {
  res.render("login");

})

.post(function(req, res ) {
	const user = new User({
		username: req.body.username,
		password: req.body.password
	});

	  passport.authenticate('local', {
      successRedirect: '/home',
      failureRedirect: '/login',
    })(req, res);

  });
   
app.route("/register")
.get(function(req, res) {
  res.render("register")

 })

.post(function(req, res) {
	const username = req.body.username;
    const password = req.body.password;

	User.register({username: username, provider: "local", email: username }, password, function(err, user) {
     if (err) {
       console.log(err);
       res.redirect("/register");
     } else {
       passport.authenticate("local")(req, res, function() {
         res.redirect("/home");
       });
     }

   });
	});



app.get("/posts/:postId", function (req, res) {

	let pass = req.params.postId;

	const userID = req.user._id;
    User.findOne({
            _id: userID
        },
        function(err, results) {
            if (!err) {
                var foundUserBlogs = results.blogData;
                var foundPost = foundUserBlogs.filter(function(item) {
                    return item._id == pass;
                });
                res.render("post", {
                    postTitle: foundPost[0].title,
                    postContent: foundPost[0].body
                });
            }
        }
    );
});


app.route("/compose")
.get(function(req, res) {
  if (req.isAuthenticated()) {
        res.render("compose");
    } else {
        console.log("Not Logged in");
        res.send("Not Logged In")      
    }

})

.post(function(req, res) {
    const post = {
    title: req.body.blogTitle,
    body: req.body.blogPost
  };

  User.findOneAndUpdate({
            _id: req.user.id
        }, {
            $push: {
                blogData: post
            }
        },
        function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log("success");
            }
        }
    );
    res.redirect("/home");
});
  

app.get("/about", function (req, res) {

	res.render("about", {
		aboutContent : aboutContent
	});
})


app.get("/contact", function (req, res) {

	res.render("contact", {
		contactContent: contactContent
	});
})


app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/login");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
