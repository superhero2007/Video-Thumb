var VersionProvider = require('./version_provider');
var version_provider = new VersionProvider();
var fs = require('fs');

sendVersion = function(req, res, next) {
    console.log(' GET ' + req.originalUrl);
	var result = { "version" : version_provider.getVersion(), "context" : req.originalUrl };
    res.contentType('application/json');
    res.send(result);
};

sendFile = function(res, filename) {
    var options = {
        root: static_content,
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    res.sendFile(filename, options, function(err) {
        if (err) {
            console.log(err);
            res.status(err.status).end();
        }
    });
};

sendFavicon = function(req, res, next) {
    console.log('GET ' + req.originalUrl + ' - returning favicon.ico');
    sendFile(res, 'favicon.ico');
};

sendIndex = function(req, res, next) {
    console.log('GET ' + req.originalUrl);
    sendFile(res, 'index.html');
};

sendJSON = function(res, output) {
  if (output) {
    res.contentType('application/json');
    res.status(200).send(output);
  } else {
    res.status(200).send({});
  }
  res.end();
};

sendNotFound = function(res) {
  res.contentType('application/none');
  res.status(404);
  res.end();
};

sendCreated = function(res, location) {
  if (location) {
    res.contentType('application/none');
    res.setHeader("Location", location);
    res.status(201).send();
  } else {
    res.status(200).send();
  }
  res.end();
};

sendWontUpdate = function(res, location_url, reason_data ) {
  var cause = {
    location: location_url,
    reason: reason_data
  };
  res.contentType('application/json');
  res.status(409).send(cause);
  res.end();
};

catchAllErrorHandler = function(err, req, res, next) {

    res.contentType('application/json');
    var error = {
        "type": "InternalServerError",
        "error": {
            "name": err.name,
            "message": err.message,
            "stack": err.stack
        },
        "received_headers": req.headers,
        "api": req.originalUrl,
    }

    console.log(error);
    res.status(500).send(error);
    res.end();
};

invalidArgumentHandler = function(err, req, res, next) {

    var invalid_arg = false;
    var arg_name = null;
    var arg_context = null;

    if (err.name == 'invalid_argument') {
       invalid_arg = true;
       arg_name = err.invalid_argument_name;
       arg_context = err.message;
    } else if (req.elx && req.elx.invalid_argument_name) {
       invalid_arg = true;
       arg_name = req.elx.invalid_argument_name;
       arg_context = (req.elx.invalid_argument_context) ? req.elx.invalid_argument_context : '';
    }

    if (invalid_arg) {
        res.contentType('application/json');
        var error = {
            "type": "InvalidArgument",
            "argument_name": arg_name,
            "argument_context": arg_context,
            "received_headers": req.headers,
            "api": req.originalUrl,
        }

        res.status(400).send(error);
        res.end();
    } else {
        next(err);
    }
};

initElxObject = function(req, res, next) {
  req.elx = {}
  next();
};

randomInt = function(high, low) {
    return Math.floor(Math.random() * (high - low) + low);
};

dateDiff = function(startDate, endDate, rtn) {
    return Math.abs((startDate.getTime()-endDate.getTime())/ rtn);
};

sessionCheck = function(req) {
  // Check both s_id and sid because we saw s_id being removed from the headers
  // behind some proxies/hotspot situations.
//  var session_id = req.get('s_id');
//  if (!session_id) { session_id = req.get('sid'); }

//  if (!session_id) {
//    req.elx.invalid_argument_name = 'sid';
//    req.elx.invalid_argument_context = { "message": "`sid` not in request. Expected in header and required by this API", "headers_received" : req.headers };
//    next(new Error('invalid_argument'));
//    return;
//  }
    return true;
};

copyFile = function(source, target) {
    return new Promise(function(resolve, reject) {
        var rd = fs.createReadStream(source);
        rd.on('error', reject);
        var wr = fs.createWriteStream(target);
        wr.on('error', reject);
        wr.on('finish', resolve);
        rd.pipe(wr);
    });
};

module.exports = {
    sendFavicon: sendFavicon,
    sendFile: sendFile,
    sendVersion: sendVersion,
    sendIndex: sendIndex,
    sendJSON: sendJSON,
    sendNotFound: sendNotFound,
    sendCreated: sendCreated,
    sendWontUpdate: sendWontUpdate,
    initElxObject: initElxObject,
    invalidArgumentHandler: invalidArgumentHandler,
    catchAllErrorHandler: catchAllErrorHandler,
    randomInt: randomInt,
    dateDiff: dateDiff,
    sessionCheck: sessionCheck,
    copyFile: copyFile,
    MILLIS: 1,
    SECS: 1000,
    MINS: 60000,
    PLATFORM: "node",
    NAME_STRING: "HashPlayBE"
};