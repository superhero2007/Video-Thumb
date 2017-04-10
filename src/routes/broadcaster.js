var express = require('express');
var router = express.Router();
var utils = require('../utilities')
var BroadcastProvider = BroadcastProvider || require('../broadcast_provider');
var title_provider = title_provider || require('../title_provider');

    router.use(utils.initElxObject);

router.param('title_id', function(req, res, next, title_id) {

  var title = title_provider.find(title_id);
  if (title) {
      req.elx.title = title;
      next();
  } else {
      req.elx.invalid_argument_name = 'title_id';
      req.elx.context = "title not found or invalid title_id: " + title_id;
      next(new Error(req.elx.context));
  }
});

router.get('/v1/titles', function(req, res, next) {

    var original = {};
    original.titles = {}
    var all_titles = title_provider.get();

    for (var title_name in all_titles) {

        var title = all_titles[title_name];
        if (title.provider != "hitbox") {
            original.titles[title.id] = title;
        }
    }

    var output = JSON.parse(JSON.stringify(original));
    output.mdts = new Date().toJSON();
    sendJSON(res, output);
});

router.post('/v1/broadcast/:title_id', function(req, res, next) {
  var broadcast_data = req.body;
  if (!broadcast_data) {
      req.elx.invalid_argument_name = 'request.body';
      req.elx.invalid_argument_context = "expecting application/json as request body";
      next(new Error('invalid_argument'));
      return;
  }

  var publisher_name = req.get('publisher_name');
  if (!publisher_name) { publisher_name = req.body.publisher_name; }
  if (!publisher_name) {
    req.elx.invalid_argument_name = 'publisher_name';
    req.elx.invalid_argument_context = "`publisher_name` not found in the headers.  Cannot create broadcast for " + req.elx.title.id;
    next(new Error('invalid_argument'));
    return;
  }

  var messages = [];
  if (null != req.body.publisher_name && req.body.publisher_name != publisher_name) {
    messages.push("`publisher_name` in header was: " + publisher_name +
        " while `publisher_name` in post body was " + req.body.publisher_name +
        ".  Will continue to handle broadcast create with the header value, but this is likely not what the caller intended ");
  }

  // do something here to validate the inbound data
    // validate:
	// - name
	// - type
	// - title_id
	// - format
	// - publisher_name

  var broadcast_pvdr = BroadcastProvider.getInstance(req.elx.title.id);
  broadcast_data.title_id = req.elx.title.id;
  var r = broadcast_pvdr.create(publisher_name, broadcast_data);
  if (messages.length > 0) { r.result.messages.concat(r.result.messages) };
  utils.sendJSON(res, r);
});

router.post('/v1/heartbeat/:title_id', function(req, res, next) {

  var publisher_name = req.get('publisher_name');
  if (!publisher_name) { publisher_name = req.body.publisher_name; }

  if (!publisher_name) {
    req.elx.invalid_argument_name = 'publisher_name';
    req.elx.invalid_argument_context = "`publisher_name` not found in the headers.  Cannot heartbeat broadcast for " + req.elx.title.id;
    next(new Error('invalid_argument'));
    return;
  }

  var messages = [];
  if (null != req.body.publisher_name && req.body.publisher_name != publisher_name) {
    messages.push("`publisher_name` in header was: " + publisher_name +
        " while `publisher_name` in post body was " + req.body.publisher_name +
        ".  Will continue to handle heartbeat for broadcast with the header value, but this is likely not what the caller intended ");
  }

  var broadcast_pvdr = BroadcastProvider.getInstance(req.elx.title.id);

  if (broadcast_pvdr.heartbeat(publisher_name, req.body)) {
      utils.sendJSON(res, { "result":"ok", "messages": messages });
  } else {
    req.elx.invalid_argument_name = "title_id:publisher_name";
    req.elx.invalid_argument_context = "Could not locate a broadcast by " + publisher_name + " for " + req.elx.title.id;
	next(new Error(req.elx.invalid_argument_context));
	return;
  }
});

router.delete('/v1/broadcast/:title_id', function(req, res, next) {

  var publisher_name = req.get('publisher_name');
  if (!publisher_name) { publisher_name = req.body.publisher_name; }

  if (!publisher_name) {
    req.elx.invalid_argument_name = 'publisher_name';
    req.elx.invalid_argument_context = "`publisher_name` not found in the headers.  Cannot heartbeat broadcast for " + req.elx.title.id;
    next(new Error('invalid_argument'));
    return;
  }

  var messages = [];
  if (null != req.body.publisher_name && req.body.publisher_name != publisher_name) {
    messages.push("`publisher_name` in header was: " + publisher_name +
        " while `publisher_name` in post body was " + req.body.publisher_name +
        ".  Will continue to handle heartbeat for broadcast with the header value, but this is likely not what the caller intended ");
  }

  var broadcast_pvdr = BroadcastProvider.getInstance(req.elx.title.id);

  var result = broadcast_pvdr.delete(publisher_name); 
  if (result) {
      utils.sendJSON(res, result);
  } else {
	next(new Error("An error occurred in the broadcast provider which did not return any data for the delete API"));
	return;
  }
});

// ---- STANDARD routes ---- //
router.get('/v', utils.sendVersion);
router.get('/favicon', utils.sendFavicon);
router.get('*', utils.sendIndex);

module.exports = router;
