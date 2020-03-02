//jshint esversion:6

// Load all necessary modules
const express = require("express");
const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");
const axios = require("axios");
const cookieParser = require("cookie-parser");

// Call the express function to launch the application and store inside the app variable
// This starts a new instance of the Express application
const app = express();

/* The View is how our application displays information to our client along with the
tools that are used to generate this display. HTML is dynamically generated in this
case, so we need to set the Handlebars templating engine*/
app.engine("handlebars", exphbs());   // Files should end in .handlebars
app.set("view engine", "handlebars");
app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));    // Serve static file such as CSS using static middleware function

// A client making a GET request to get information sent back to them
app.get("/", function(req, res) {
  // Response should render the home.handlebars route
  res.render("home");
});

// Standard URL to the API (will append routes to the end of the URL depending on the request)
const TODO_API_URL = "https://hunter-todo-api.herokuapp.com";

// A client making a GET request to retrieve the page of users
app.get("/users", function(req, res) {
  // we are using axios to make a request to the API
  // our model is now composed of our API (which we are only reading from in this example)
  axios.get(TODO_API_URL + "/user").then(function(response) {
    // we pass our response data to our view engine, which will template it into our HTML view
    // The client wiil receive user-list.handlebars and users will be templated into that file
    res.render("user-list", {
      users: response.data
    });
  });
});

// A client making a GET request to render the page of users when a user is successfully registered
app.get("/successful", function(req, res) {
  // We are using axios to make a request to the API
  // our model is now composed of our API (which we are only reading from in this example)
  axios.get(TODO_API_URL + "/user").then(function(response) {
    // we pass our response data to our view engine, which will template it into our HTML view
    // The client wiil receive user-list.handlebars and users will be templated into that file
    res.render("successful", {
      users: response.data
    });
  });
});

// We are creating a user which modifies the to-do list API by adding a new user to their database
// So, a client makes a POST request in general to our server and our server acts as a client to POST to the API as well
app.post("/register", function(req, res) {
  // Using axios to request posting data to their API
  // Second parameter is the data we are sending to the API
  axios.post(TODO_API_URL + "/user", {
      username: req.body.newUser
    }).then(function(response) {

      // redirect to the successful page
      res.redirect("/successful");
    })
    .catch(function(error) {
      console.log(error);
    });
});

// When a user wants to login and view someone's to-do list items, they need to authorize their authentication
// A client makes a POST request to pass along the username Log In and a cookie is created to start their session
app.post("/auth", function(req, res) {
  // we are using axios to make a post request to the API
  // our model is now composed of the API (which we want to authenticate as a user to the API)
  axios.post(TODO_API_URL + "/auth", {
      username: req.body.logUser
    }).then(function(response) {
      // Check if client sent a cookie
      let cookie = req.cookies.Authentication;
      // If not, set a new cookie
      if (cookie === undefined) {
        res.header('set-cookie', `Authentication=${response.data.token}`);
        res.render("authenticate");
      }

      // If they did, a cookie was already present and we read that cookie
      else {
        console.log("cookie exists: ", cookie);
        res.render("authenticate");
      }
    })
    .catch(function(error) {
      console.log(error);
    });
});

// A client makes a GET request to retrieve the to-do list item of the user they authenticated as
app.get("/all-items", function(req, res) {
  // Axios GET request bundled with data to communicate with the API
  axios({
      method: 'get',
      url: TODO_API_URL + "/todo-item",
      headers: {
        "Authorization": req.cookies.Authentication
      },
      // `transformResponse` allows changes to the response data to be made before
      // it is passed to then/catch
      transformResponse: [function(data) {
        // Make sure deleted items are not shown in the list
        let parseData = JSON.parse(data);
        let updatedArray = [];
        for(var i = 0; i < parseData.length; i++){
          if(parseData[i].deleted !== true){
            updatedArray.push(parseData[i]);
          }
        }
        //data = updatedArray;
        return updatedArray;
      }]
    }).then(function(response) {
      // Re-render the list with the newly added item/not showing deleted items by redirecting to the route that renders the list
      res.render("individual-list", {items: response.data});
    })
    .catch(function(error) {
      res.render("individual-list");    // Handling when there is an empty to do list (empty data array)
    });
});

// A client makes a POST request to "post" data to the our server and then send it along to the API
app.post("/insert-new-item", function(req, res) {
  // Axios POST request
  axios({
      method: 'post',
      url: TODO_API_URL + "/todo-item",
      data: {
        content: req.body.newText
      },
      headers: {
        "Authorization": req.cookies.Authentication
      }
    }).then(function(response) {
      console.log(response);
      // Re-render the list with the newly added item by redirecting to the route that renders the list
      res.redirect("/all-items");
    })
    .catch(function(error) {
      console.log(error);
    });
});

// A client makes a POST request to update an item has completed
app.post("/update-item", function(req, res) {
  // Axios PUT request
  axios({
      method: 'put',
      url: TODO_API_URL + "/todo-item/" + req.body.inputid,
      data: {
        completed: true
      },
      headers: {
        "Authorization": req.cookies.Authentication
      }
    }).then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.log(error);
    });
});

// A client makes a POST request to pass along data (namely the id of an item) to the server in order to delete an item from the API
app.post("/delete-item", function(req, res) {
  // Axios DELETE request
  axios({
      method: 'delete',
      url: TODO_API_URL + "/todo-item/" + req.body.buttonid,
      data: {
        deleted: true
      },
      headers: {
        "Authorization": req.cookies.Authentication
      }
    }).then(function(response) {
      console.log(response);
      // Re-render the list with the newly deleted item by redirecting to the route that renders the list
      res.redirect("/all-items");
    })
    .catch(function(error) {
      //console.log(error);
    });
});

// A client makes a POST request to log out (but nothing is really posted)
app.post("/log-out", function(req, res) {
  // Clear the cookie and end the session
  res.clearCookie("Authentication");
  // Redirect to the homepage
  res.redirect("/");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

// Server starts on Heroku's choosing of a port or port 3000 on local systems
app.listen(port, function() {
  console.log("Server has started successfully");
});
