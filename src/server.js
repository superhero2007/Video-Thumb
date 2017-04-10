var version = '0.19.1';
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var compression = require('compression');
var express = require('express');
var cors = require('cors');
var fs = require('fs');
var logger = require('morgan');
//var newRelic = require('newrelic');
var path = require('path');
var requestIp = require('request-ip')

var broadcaster = require('./routes/broadcaster');
var cms = require('./routes/cms');
var helo = require('./routes/helo');
var stream = require('./routes/instream');
var location = require('./routes/location');
var media = require('./routes/media');

var utils = require('./utilities')

var DEV_MODE = false;
var caches = {}
var app = express();

app.use(compression());
app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(requestIp.mw())

static_content = path.join(__dirname, "public");
console.log("Static content served from " + static_content)
app.use(express.static(static_content));

require('./broadcasts_dirloader')('data/broadcasts'); //init cache


app.use('/helo', helo);
app.use('/plr', cms);
app.use('/brd', broadcaster);
app.use('/str', stream);
app.use('/lug', location);
app.use('/med', media);

app.use(utils.invalidArgumentHandler);
app.use(utils.catchAllErrorHandler);

//HTTP PORT for API
var port = (process.env.PORT) ? process.env.PORT : 3412;
app.listen(port, '0.0.0.0', function () {
    console.log("Hashplay Content API Server started on port " + port);
});

//Default MONGO host
var mongoHost   = (process.env.MONGO_HOST)   ? process.env.MONGO_HOST   : "localhost";
var mongoDbName = (process.env.MONGO_DBNAME) ? process.env.MONGO_DBNAME : "hplay";
var mongoUser   = (process.env.MONGO_USER);
var mongoPass   = (process.env.MONGO_PASS);
require("./models/db")(mongoHost, mongoDbName, mongoUser, mongoPass);

//Hitbox Job CRON
if (process.env.ENABLE_HB_SYNC) {
  var hitboxCron = (process.env.HB_CRON) ? process.env.HB_CRON : "0-59/1 * * * *";
  require("./jobs/jobSchedule")({ "hitbox": hitboxCron });
}

// ---- STANDARD routes ---- //
app.get('/v', utils.sendVersion);
app.get('/favicon', utils.sendFavicon);
app.get('*', utils.sendIndex);

module.exports = app;
