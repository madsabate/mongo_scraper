var express = require('express');
var bodyParser = require('body-parser');
var handlebars = require('express-handlebars');
var mongoose = require('mongoose');
var path = require('path');

// Init scraping tool cheerio. Request is used for HTTP/HTTPS calls
var cheerio = require('cheerio');
var request = require('request');

// Require all models
var db = require('./models');

var PORT = process.env.PORT || 3000;

// Initialize App
var app = express();

// Configure middleware

// Handlebars View engine
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', handlebars({
    defaultLayout: 'layout'
}));
app.set('view engine', 'handlebars');

// Body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

// express.static to serve the public folder as a static directory
app.use(express.static(path.join(__dirname, 'public')));

// Mongoose
mongoose.Promise = Promise;
mongoose.connect("mongodb://heroku_s3lcjgc6:bn6arcfla7q6g9bm03lmf16he2@ds239557.mlab.com:39557/heroku_s3lcjgc6");
console.log(mongoose.connection.readyState);

// Routes

// Rendering Handlebar pages for Heroku deployment
app.get("/", function(req, res) {
    db.Article.find({"saved": false}, function(error, data) {
      var hbsObject = {
        article: data
      };
      console.log(hbsObject);
      res.render("home", hbsObject);
    });
  });
// Render saved article page
app.get("/saved", function(req, res) {
    db.Article.find({"saved": true}).populate("notes").exec(function(error, articles) {
      var hbsObject = {
        article: articles
      };
      res.render("saved", hbsObject);
    });
  });

// GET route for scrapin techcrunch website
app.get('/scrape', function (req, res) {
    // Grab the body of the html with request
    request('http://www.echojs.com', function (error, response, html) {
        // load into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);

        // Grab every article header within an article tag
        $('article h2').each(function (i, element) {
            // Save empty result object
            var result = {};

            result.title = $(this)
                .children('a')
                .text()
            result.link = $(this)
                .children('a')
                .attr('href');

            // Create a new Article using the 'result' object built from scraping
            db.Article
                .create(result)
                .then(function (dbArticle) {
                    // If scrape successful, save an article to db, and send message to client
                    res.send('Scrape Complete');
                })
                .catch(function (err) {
                    // If error, send to client
                    res.json(err);
                });
        });
    });
});

// Route for getting articles from db
app.get("/articles", function(req, res) {
    // Grab every doc in the Articles array
    db.Article.find({}, function(error, res) {
      // Log any errors
      if (error) {
        console.log(error);
      }
      // Or send the doc to the browser as a json object
      else {
        res.json(res);
      }
    });
  });

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ "_id": req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    // execute above function
    .exec(function(error, doc) {
      // Log any errors
      if (error) {
        console.log(error);
      }
      // Otherwise, send the doc to the browser as a json object
      else {
        res.json(doc);
      }
    });
  });

// Save an article
app.post("/articles/saved/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Article
        .findOneAndUpdate({
            '_id': req.params.id
        }, {
            'saved': true
        })
        // Execute the function above
        .exec(function (err, doc) {
            if (err) {
                console.log(err);
            } else {
                res.send(doc);
            }
        });
});

// Delete Article
app.post('/articles/delete/:id', function (req, res) {
    // Use article id to find and update saved boolean
    db.Article.
    findOneAndUpdate({
            '_id': req.params.id
        }, {
            'saved': false,
            'notes': []
        })
        //Execute the function above
        .exec(function(err, doc) {
            if (err) {
                console.log(err);
            }else {
                res.send(doc);
            }
        });
});

//Create a note
app.post("/notes/saved/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    var newNote = new Note({
        body: req.body.text,
        article: req.params.id
    });
    console.log(req.body)
    // And save the new note the db
    newNote.save(function (error, note) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Otherwise
        else {
            // Use the article id to find and update it's notes
            db.Article.findOneAndUpdate({
                    "_id": req.params.id
                }, {
                    $push: {
                        "notes": note
                    }
                })
                // Execute the function above
                .exec(function (err) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                        res.send(err);
                    } else {
                        // Or send the note to the browser
                        res.send(note);
                    }
                });
        }
    });
});

// Delete note
app.delete("/notes/delete/:note_id/:article_id", function (req, res) {
    // Use the note id to find and delete it
    Note.findOneAndRemove({
        "_id": req.params.note_id
    }, function (err) {
        // Log any errors
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            Article.findOneAndUpdate({
                    "_id": req.params.article_id
                }, {
                    $pull: {
                        "notes": req.params.note_id
                    }
                })
                // Execute the function above
                .exec(function (err) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                        res.send(err);
                    } else {
                        // Send updated response
                        res.send();
                    }
                });
        }
    });
});



// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});