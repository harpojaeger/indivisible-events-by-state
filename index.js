var express = require('express')
var app = express()
var request = require('request')
var bodyParser = require('body-parser')
var async = require('async')
var RSS = require('rss')
var dateFormat = require('dateformat')
var port = process.env.PORT

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.get('/favicon.ico', function(req, res) {
  res.send(null)
})

app.get('/:state/feed', function(req, res) {
  console.log('Looking for events in ' + req.params.state)
  var feedOptions = {
    title: 'Indivisible events in ' + req.params.state.toUpperCase(),
    feed_url: 'https://indivisible-events-by-state.herokuapp.com/' + req.params.state + '/feed',
    site_url: 'http://indivisibleguide.org',
  }
  var feed = new RSS(feedOptions);
  var theRightEvents = []
  var urls = []
  for(page = 1; page <19; page++){
    urls.push('https://actionnetwork.org/api/v2/event_campaigns/07f7cfec-bd20-48bf-b309-380022daacb8/events?page='+page)
  }

  var fetch = function(file, cb) {
    //console.log('Fetching ' + file)
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
            var state = this_event.location.region.toUpperCase()
            if (state === req.params.state.toUpperCase()){
              theRightEvents.push(this_event)
            }
          })
        } catch(e) {
          console.log('Error encountered')
          console.log(e)
        }
      }
      console.log('Found ' + theRightEvents.length + ' events in ' + req.params.state)
      console.log('Generating feed.')
      for(i=0; i<theRightEvents.length; i++) {
        var thisEvent = theRightEvents[i]
        console.log('Processing event ',(i+1),'/',theRightEvents.length)
        //console.log(thisEvent)
        var formattedTime = dateFormat(thisEvent.start_date, 'UTC:ddd, mmm d, h:MM TT')

        var itemOptions = {
          title: thisEvent.title,
          description: '<p>' + formattedTime + '</p>' + thisEvent.description,
          url: thisEvent.browser_url,
          guid: thisEvent.identifiers[0],
          author: thisEvent._embedded['osdi:creator'].given_name + ' ' + thisEvent._embedded['osdi:creator'].family_name,
          date: thisEvent.start_date,
          lat: thisEvent.location.location.latitude,
          long: thisEvent.location.location.longitude,
        }
        console.log(itemOptions);
        feed.item(itemOptions);
      }
      var xml = feed.xml({indent: true})
      res.send(xml)
    }
  })
})

app.get('*', function(req, res) {
  res.send('Hello world.')
})
app.listen(port, function() {
  console.log('Node app is running on port', port)
})
