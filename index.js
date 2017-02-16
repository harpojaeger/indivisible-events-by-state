var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser')
var async = require('async');

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.get('/favicon.ico', function(req, res) {
  res.send(null);
})
app.get('/:state', function(req, res) {
  console.log('Looking for events in ' + req.params.state)
  var theRightEvents = []
  var urls = []
  for(page = 1; page <19; page++){
    urls.push('https://actionnetwork.org/api/v2/event_campaigns/07f7cfec-bd20-48bf-b309-380022daacb8/events?page='+page)
  }

  var fetch = function(file, cb) {
    console.log('Fetching ' + file)
    var options = {
      method: 'GET',
      url: file,
      headers: {
        'OSDI-API-Token': 'cac04e8d7b1faf6dc100f492238e3968'
      }
    }
    request(options, function(err, response, body) {
      if (err) {
        cb(err)
      } else {
        cb(null, body)
      }
    })
  }
  console.log('async time!')
  async.map(urls, fetch, function(err, results){
    if (err) {
      console.log('Uh oh, got an error.')
    } else {
      for(i=0; i<results.length; i++) {
        console.log('Processing page ' + (i+1))
        var page = results[i]
        try {
          response = JSON.parse(page)
          var events = response._embedded['osdi:events']
          events.forEach(function(this_event) {
            var state = this_event.location.region;
            if (state == req.params.state){
              theRightEvents.push(this_event)
            }
          })
        } catch(e) {
          console.log('Error encountered')
          console.log(e)
        }
      }
      res.send(theRightEvents);
      console.log('Found ' + theRightEvents.length + ' events in ' + req.params.state)
    }
  })


})

app.listen(5000, function() {
  console.log('Node app is running on port 5000');
});
