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

router.put('/api/v1/todos/:type/:name', function(req, res) {

//types:
//tagname
//note (name/complete)

    
    var data = {name: req.body.name, completed: req.body.completed};

    pg.connect(connectionString, function(err, client, done) {
        
         // Catch errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        
        if (req.params.type == 'tagname') {
            client.query('UPDATE taglist SET tag_name = ($1) WHERE tag_name = ($2)', [data.name, req.params.name]);
        }

        if (req.params.type == 'note') {
            if (data.name.length) {
                client.query('UPDATE notes SET name = ($1) WHERE id = ($2)', [data.name, req.params.name]);
            }

            if (data.completed.length) {
                client.query('UPDATE notes SET completed = ($1) WHERE id = ($2)', [data.completed, req.params.name]);
            }
        }


    });

return res.json({});

});

router.get('/api/v1/todos', function(req, res) {


    var data = {date: req.query.date, completed: req.query.completed, color: req.query.color, tags : req.query.tags};
    console.log(data.date);
    if (!data.date) data.date = 'date';
    if (!data.completed) data.completed = 'completed';
    if (!data.color) data.color = 'color_code';
    if (!data.tags) data.tags = '';
    console.log(data.date + " " + data.completed  + " " + data.color );
    var results = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Select Data
                      client.query(`CREATE OR REPLACE VIEW temp AS 
                                    SELECT notes.*, array_agg(taglist.tag_name) AS tags
                                    FROM notes

                                    LEFT JOIN notetags
                                    ON notetags.note_id = notes.id 
                                    LEFT JOIN  taglist 
                                    ON notetags.taglist_id = taglist.id GROUP BY 1 ORDER BY date ASC, id ASC;`);
                      
                      client.query(`CREATE OR REPLACE VIEW temp2 AS SELECT temp.*, colorlist.color_code
                                    FROM temp
                                    LEFT JOIN notecolor
                                    ON notecolor.note_id = temp.id 
                                    LEFT JOIN  colorlist 
                                    ON notecolor.colorlist_id = colorlist.id;`);
         var query =  client.query("SELECT * FROM temp2 WHERE completed="+data.completed+" AND date="+data.date+" AND color_code="+data.color+" AND '{"+data.tags+"}' <@ tags" );



        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            return res.json(results);
        });

    });

});

router.delete('/api/v1/todos/:note_id', function(req, res) {

    var results = [];
    var id = req.params.note_id;

    pg.connect(connectionString, function(err, client, done) {
      
      // Catch errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

      
        client.query("DELETE FROM notes WHERE id=($1)", [id]);
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

        //Add note, set node id to use later;
        client.query("INSERT INTO notes(name, date, completed) values($1, $2, $3)", [data.name, data.date, data.completed]);

        var noteId;
        client.query('SELECT id FROM notes ORDER BY id DESC LIMIT 1', function(err, _data) {
        if (err) {
          console.log('A db error occurred: ' + err);
          return;

          
        }
        noteId = _data.rows[0].id;
        });

        //Add colors to notes
        
        client.query('SELECT id FROM colorlist WHERE color_code = '+data.color, function(err, _data) {
        if (err) {
          console.log('A db error occurred: ' + err);
          return;
        }
        
        if(_data.rows.length) { //if color exist then use it, else use default color
              client.query("INSERT INTO notecolor(colorlist_id, note_id) values($1, $2)", [_data.rows[0].id, noteId]);
        }
        else {
             client.query("INSERT INTO notecolor(colorlist_id, note_id) values($1, $2)", [1, noteId]);
        }

        });


        //Add tags to notes

        if (Array.isArray(data.tag)) { //Chek if tag exist, add tags to tag table
            for (i = 0; i < data.tag.length; i++) {
                if (data.tag[i].length>0) {
                    client.query("INSERT INTO taglist(tag_name) values($1) ON CONFLICT DO NOTHING", [data.tag[i]]);


                    client.query("SELECT id FROM taglist WHERE tag_name = ($1)", [data.tag[i]], function(err, _data) {
                    if (err) {
                      console.log('A db error occurred: ' + err);
                      return;
                    }
                    client.query("INSERT INTO notetags(taglist_id, note_id) values($1, $2)", [_data.rows[0].id, noteId]);
                    });


                }
            }
        }
        else {
            if (data.tag.length>0) {
                    client.query("INSERT INTO taglist(tag_name) values($1) ON CONFLICT DO NOTHING", [data.tag]);
                    
                    client.query("SELECT id FROM taglist WHERE tag_name = ($1)", [data.tag], function(err, _data) {
                    if (err) {
                      console.log('A db error occurred: ' + err);
                      return;
                    }
                    client.query("INSERT INTO notetags(taglist_id, note_id) values($1, $2)", [_data.rows[0].id, noteId]);
                    });    
            }
        }

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