var express = require('express')
var app = express()
var request = require('request')
var bodyParser = require('body-parser')
var async = require('async')
var RSS = require('rss')
var dateFormat = require('dateformat')
var pg = require('pg')
pg.defaults.ssl = true
var knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  searchPath: 'knex,public'
})
var port = process.env.PORT
var event_campaign_id = process.env.event_campaign_id
var event_table_name = 'events_' + event_campaign_id

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.get('/favicon.ico', function(req, res) {
  res.send(null)
})

app.get('/:state/feed', function(req, res) {
  console.log(req)
  console.log('Looking for events in ' + req.params.state)

  async.waterfall([
    function(cb){
      knex(event_table_name)
      .where({
        state: req.params.state
      })
      .select('json','start_date')
      .orderBy('start_date','asc')
      .then(function(rows){
        cb(null,rows)
      })
    },
    function(inStateEvents,cb){
      var feedOptions = {
        title: 'Indivisible events in ' + req.params.state.toUpperCase(),
        feed_url: 'https://indivisible-events-by-state.herokuapp.com/' + req.params.state + '/feed',
        site_url: 'http://indivisibleguide.org',
        type: 'application/xml'
      }
      // Create a new RSS feed
      var feed = new RSS(feedOptions);
      console.log('Found ' + inStateEvents.length + ' events in ' + req.params.state)
      console.log('Generating feed.')
      var upcomingEvents = 0;
      inStateEvents.forEach(function(thisEvent){
        if (Date.parse(thisEvent.start_date) > Date.now()) {
          // Keep track of how many events are in the future – don't output others
          upcomingEvents++
          // We're only interested in the json field from the db (others are just for sorting and filtering)
          var eventDetails = thisEvent.json

          //console.log(eventDetails)
          var formattedTime = dateFormat(eventDetails.start_date, 'UTC:ddd, mmm d, h:MM TT')
          // Create a new feed item for each event
          var itemOptions = {
            title: eventDetails.title,
            description: '<p>' + formattedTime + '</p>' + eventDetails.description,
            url: eventDetails.browser_url,
            guid: eventDetails.identifiers[0],
            author: eventDetails._embedded['osdi:creator'].given_name + ' ' + eventDetails._embedded['osdi:creator'].family_name,
            date: eventDetails.start_date,
            lat: eventDetails.location.location.latitude,
            long: eventDetails.location.location.longitude,
          }
          //console.log(itemOptions);
          // Add the item to the feed
          feed.item(itemOptions);
        }

      })
      // Generate XML...
      var xml = feed.xml({indent: true})
      // And send it off!
      res.send(xml)
      console.log('Created feed for',req.params.state,'with',upcomingEvents,'upcoming events.')

    }
  ])

})

app.get('*', function(req, res) {
  res.send('Hello world.')
})
app.listen(port, function() {
  console.log('Node app is running on port', port)
})
