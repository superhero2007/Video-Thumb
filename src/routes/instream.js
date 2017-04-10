var express = require('express');
var cors    = require('cors');
var router = express.Router();
var utils = require('../utilities')

var stream_handler = stream_handler || require('../stream_handler');

router.use(utils.initElxObject);

router.get('/v1/event_types', cors(), function(req, res, next) {
    // return a list of distinct types and counts of them
});

router.get('/v1/events', cors(), function(req, res, next) {
    // return a paged
});

router.post('/v1/', function(req, res, next) {

  // Check both s_id and sid because we saw s_id being removed from the headers
  // behind some proxies/hotspot situations.
  var session_id = req.get('s_id');
  if (!session_id) { session_id = req.get('sid'); }

  if (!session_id) {
    req.elx.invalid_argument_name = 'sid';
    req.elx.invalid_argument_context = { "message": "`sid` not in request. Expected in header and required by this API", "headers_received" : req.headers };
    next(new Error('invalid_argument'));
    return;
  }

  try {
    stream_handler.process(session_id, req.body);
  } catch (e) {
    next(e);
    return;
  }

  res.contentType('application/json');
  res.send({ "result":"ok"});
});

// ---- STANDARD routes ---- //
router.get('/v', utils.sendVersion);
router.get('/favicon', utils.sendFavicon);
router.get('*', utils.sendIndex);

module.exports = router;
