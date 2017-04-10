var version = '0.1.2'
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var compression = require('compression');
var express = require('express');
var fs = require('fs');
var logger = require('morgan');
var path = require('path');
var requestIp = require('request-ip')

var test = require('./routes/test_lambda');

var utils = require('./utilities')

var DEV_MODE = false;
var caches = {}
var app = express();

app.use(compression());
app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(requestIp.mw())

app.use('/test', test);

app.use(utils.invalidArgumentHandler);
app.use(utils.catchAllErrorHandler);

//HTTP PORT for API
var port = (process.env.PORT) ? process.env.PORT : 3412;
app.listen(port, '0.0.0.0', function () {
    console.log("Hashplay Video Thumbnail Generator Lambda Test Server started on port " + port);
});

module.exports = app;
