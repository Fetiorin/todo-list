var express = require('express');
var router = express.Router();
var pg = require('pg');
var path = require('path');
var connectionString = require(path.join(__dirname, '../', 'config'));




router.post('/api/v1/test', function(req, res) {

var results = [];
 pg.connect(connectionString, function(err, client, done) {
        
        var query = client.query("SELECT tag_name FROM taglist WHERE tag_name = $1", ["в2уз"]);

        query.on('row', function(row) {
            results.push(row);
        });

        query.on('end', function() {    
        console.log(results.length);
        });

    });

 return res.json({});
});


router.post('/api/v1/todos', function(req, res) {

    
    
    // Grab data from http request
    var data = {name: req.body.name, date: req.body.date, completed: false, tag: req.body.tag, color: req.body.color};
  // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        
        // Catch errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }
        console.log(data.tag.length);


        //tags

        if (Array.isArray(data.tag)) {
            for (i = 0; i < data.tag.length; i++) {
                if (data.tag[i].length>0) {
                    client.query("INSERT INTO taglist(tag_name) values($1) ON CONFLICT DO NOTHING", [data.tag[i]]);
                }
            }
        }
        else {
            if (data.tag.length>0) {
                    client.query("INSERT INTO taglist(tag_name) values($1) ON CONFLICT DO NOTHING", [data.tag]);
                }
        }

        //colors
         
        // note
        client.query("INSERT INTO notes(name, date, completed) values($1, $2, $3)", 
                                                [data.name, data.date, data.completed]);



        var results = [];
        // SQL Query > Select Data
        var query = client.query("SELECT * FROM notes ORDER BY id ASC");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            return res.json({});//results);
        });


    });
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;


//curl --data "name=test&date=1990-05-30&completed=false&tag=" http://127.0.0.1:3000/api/v1/todos