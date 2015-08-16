//dependencies
var express = require("express");
var dotenv = require("dotenv").load();
var app = express();
var fs = require("fs");
var ejs = require("ejs");
var request = require('request');
var sqlite3 = require('sqlite3').verbose();
var _ = require('underscore');
var db = new sqlite3.Database('forum.db');

//middleware
var bodyParser = require('body-parser');
var urlencodedBodyParser = bodyParser.urlencoded({extended: false});
app.use(urlencodedBodyParser);
var methodOverride = require('method-override');
app.use(methodOverride('_method'));
app.use(express.static('public'));
//config
app.listen(3000, function() {
  console.log("Forum on port 3000");
});

app.get('/', function(req, res){
  var template = fs.readFileSync('./views/startPage.html', 'utf8');
  var rendered = ejs.render(template);
  res.redirect('/topics');
})

app.get('/topics', function(req, res){
  var google_api = process.env.google_api;
  console.log('GET /topics route hit!')
  db.all("SELECT * FROM topics;", function(err, rows){
    if (err) {
      console.log(err)
    } else {
      var topicsData = rows;
      var template = fs.readFileSync('./views/alltopics.html', 'utf8');
      var rendered = ejs.render(template, {topicsData: topicsData, google_api: google_api});
      res.send(rendered);
    }
  })//end of db.all
})//end of app.get '/topics'

//get new form to post topic
app.get('/topics/new', function(req, res){
  var template = fs.readFileSync('./views/new.html', 'utf8');
  var rendered = ejs.render(template);
  res.send(rendered);
})//end of app.get '/topics/new'


app.post('/topics', function(req, res){
  console.log('post route hit');
  console.log(req.body);
  var rbody = req.body;
  if(rbody.img == 0){
    rbody.img = "http://challenges.s3.amazonaws.com/mta-app-quest/GA_logo.png"
  }

  var requestURL = "http://ipinfo.io/geo"
  request.get(requestURL, function(err, response, body) {
    var parsedBody = JSON.parse(body); 
    console.log(parsedBody);
    geolocation = parsedBody.city +", "+ parsedBody.region;
    console.log(geolocation);

  db.run("INSERT INTO topics (username, title, body, views, comments, geolocation, img, upvotes, downvotes) VALUES (?,?,?,?,?,?,?,?,?);", 
    rbody.username, rbody.title, rbody.body, rbody.views, rbody.comments, geolocation, rbody.img, rbody.upvotes, rbody.downvotes,
    function(err){
      if (err){
        console.log(err)
      } else {
        res.redirect('/topics');
      }
    })//end of db.run
  })//end of request
})//end of app.post '/topics'

app.post('/topics/:id/comment', function(req, res){
  console.log('comment post route hit')
  console.log(req.body);
  var id = req.params.id;
  db.run("INSERT INTO comments (cmt_username, cmt_body, cmt_geolocation, cmt_img, topics_id) VALUES (?,?,?,?,?);",
    req.body.username, req.body.body, req.body.geolocation, req.body.img, req.body.topics_id, function(err, row){
      if (err){
        console.log(err);
      } else {
        console.log('comments should update');
        db.run("UPDATE topics SET comments=comments+1 where id=?;", id, function(err){
          if (err){
            console.log(err);
          } else {
        res.redirect('/topics/');
          }
        })
      }
    })//end of db.run INSERT
})//endof app.post /topics/:id/comment

app.post('/topics/:id/comment/subcomment/:subid', function(req, res){
  console.log('subcomment route hit');
  console.log(req.body);
  var id = req.params.id;
  console.log(req.params);
  console.log(req.params.subid);
  var subid = req.params.subid;

  db.run("INSERT INTO subcomments (sub_username, sub_body, comment_id) VALUES (?,?,?);", req.body.username, req.body.body, req.body.comment_id, function(err){
    if (err){
      console.log(err)
    } else {
      res.redirect('/topics')
    }
  })//end of db.run INSERT INTO subcomments

})//end of app.post for subcomments

app.put('/topics/:id/upvote', function(req, res){
  console.log('put route hit for upvote')
  var id = req.params.id;
  db.run("UPDATE topics SET upvotes=upvotes+1 where id=?;", id, function(err){
    if (err){
      console.log(err)
    } else {
      res.redirect('/topics#load-point-'+id)
    }
    })//end of db.run UPDATE
})//end of app.post

app.get('/topicsview', function(req, res){
  console.log(req.query);
  db.all("SELECT * FROM topics ORDER BY "+req.query.view+" DESC;", function(err, rows){
    console.log(rows);
    var topicsData = rows;
    var template = fs.readFileSync('./views/alltopics.html', 'utf8');
    var rendered = ejs.render(template, {topicsData: topicsData});
    res.send(rendered);
  })
})//end of app.get topics/view


  app.get('/searchtopics', function(req, res){
    var rowsArray = [];
    db.all("SELECT * FROM topics INNER JOIN comments ON topics.id = comments.topics_id;", function(err, rows){
      if (err){
        console.log(err)
      } else {
        var data = rows;
        data.forEach(function (el){
          if (el.body.search(req.query.search) >= 0 
            || el.title.search(req.query.search) >= 0 
            || el.cmt_body.search(req.query.search) >= 0){
            console.log(req.query.search);
            console.log(el);
            
          } else {
            console.log('nothing found');
          }
        })//end of loop
      }//end of first else
    })//end of db.all
  })//end of app.get


app.get('/topics/instagram', function(req, res){
  console.log('instagram route hit')
  var pics = [];
  var tag = req.query.instagram;
  console.log(tag);
  var instagram_api = process.env.instagram_api;
  //var tag = rawTag.replace(/ /g, "_");

  // INSTEAD:
  // var myRenderedData = getDataFromApiAndRender(url, tag, filename, apiKey)
  // res.send(myRenderedData)

  var requestURL = "https://api.instagram.com/v1/tags/"+tag+"/media/recent?client_id="+instagram_api
    request.get(requestURL, function(err, response, body) {
    var parsedBody = JSON.parse(body);
    var url = parsedBody.data[0].images.standard_resolution.url;
    //console.log(url)
    parsedBody.data.forEach(function(e){
      var x = e.images.standard_resolution.url;
      pics.push(x);
    })
    //console.log(pics);
    var template = fs.readFileSync('./views/instaresults.html', 'utf8');
    var render = ejs.render(template, {parsedBody: parsedBody, pics: pics, tag: tag})
    res.send(render)
  })//end of request.get
})//end of app.get instagram

app.post('/topics/instagram', function(req, res){
  console.log('insta post route hit');
  var requestURL = "http://ipinfo.io/geo"
  request.get(requestURL, function(err, response, body) {
    var parsedBody = JSON.parse(body); 
    geolocation = parsedBody.city +", "+ parsedBody.region;
  db.run("INSERT INTO topics (username, title, body, views, comments, geolocation, img, upvotes, downvotes) VALUES (?,?,?,?,?,?,?,?,?);", req.body.username, req.body.title, req.body.body, req.body.views, req.body.comments, geolocation, req.body.img, req.body.upvotes, req.body.downvotes,
    function(err){
      if (err) {
        console.log(err);
      }
    })//end of db.run
  })
  res.redirect('/topics');
})//end of app.post topics/instagram

app.get('/topics/google_maps', function(req, res){
  console.log('google maps route hit');
  var googleApi = process.env.google_streetview_api;
  var originalQuery = req.query.maps;
  var query = originalQuery.replace(/ /g, "+");
  console.log(query);
  var requestUrl = "https://maps.googleapis.com/maps/api/streetview?key="+googleApi+"&size=600x400&location="+query
  request.get(requestUrl, function(err, response, body){
    var template = fs.readFileSync('./views/streetview.html', 'utf8');
    var render = ejs.render(template, {body: body, requestUrl: requestUrl, googleApi: googleApi, query:query, originalQuery: originalQuery});
    res.send(render);
  })//end of request.get
})//end of app.post google_maps


app.post('/topics/google_maps', function(req, res){
  console.log('post streetview route hit');
  var requestURL = "http://ipinfo.io/geo"
  request.get(requestURL, function(err, response, body) {
    var parsedBody = JSON.parse(body); 
    geolocation = parsedBody.city +", "+ parsedBody.region;
  db.run("INSERT INTO topics (username, title, body, views, comments, geolocation, img, upvotes, downvotes) VALUES (?,?,?,?,?,?,?,?,?);", req.body.username, req.body.title, req.body.body, req.body.views, req.body.comments, geolocation, req.body.img, req.body.upvotes, req.body.downvotes,
    function(err){
      if (err) {
        console.log(err);
      }
    })//end of db.run
  })
  res.redirect('/');
})//end of app.post google_maps


app.get('/topics/:id', function(req, res){
  console.log('unique id get route hit')
  var idFromParams = req.params.id;
  var template = fs.readFileSync('./views/view.html', 'utf8');
  db.all("SELECT topics.geolocation, topics.id, topics.img, comments.cmt_body, comments.cmt_id, comments.cmt_username, comments.cmt_timestamp, topics.body, topics.timestamp, topics.upvotes, topics.title, topics.username FROM topics LEFT OUTER JOIN comments ON comments.topics_id = topics.id WHERE topics.id="+req.params.id, function(err, rows){
    if (err) {
      console.log(err)
    } else {
      console.log(rows);
      db.all("SELECT topics.img, topics.username, topics.body, topics.timestamp, topics.title, topics.geolocation, topics.upvotes, topics.id, comments.cmt_id, comments.cmt_username, comments.cmt_body, comments.cmt_timestamp, comments.topics_id, topics.id, subcomments.sub_id, subcomments.sub_username, subcomments.sub_body, subcomments.sub_timestamp, subcomments.comment_id FROM comments LEFT OUTER JOIN subcomments ON subcomments.comment_id = comments.cmt_id LEFT OUTER JOIN topics ON topics.id = comments.topics_id WHERE topics.id="+req.params.id, function(err, subData){
        if (err){
          console.log(err)
        } else {
          console.log(subData)
          var render = ejs.render(template, {rows: rows, subData: subData})
          res.send(render);
        }
      })//end of db.all
    }
  })//end of db.get
})//end of app.get /topics/:id


