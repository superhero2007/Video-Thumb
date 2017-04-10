var express = require('express');
var router = express.Router();

var fs = require('fs');
var Cache = require('../cached_renderer');
var title_provider = title_provider || require('../title_provider');
//var titles_provider = new TitleProvider();
var BroadcastProvider = require('../broadcast_provider');
var utils = require('../utilities');

var caches = {};

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

// ---- READ ONLY Routes ---- //
router.get('/v1/titles', function(req, res, next) {

    var original = {};
    original.titles = {}
    var all_titles = title_provider.get();

    var delivered_count = 0;
    for (var title_name in all_titles) {

        var title = all_titles[title_name];

        if (title.cur_data && title.cur_data.bcast_count > 0) {
            var broadcast_pvdr = getBroadcastProvider(title.id);
            title.cur_data = (broadcast_pvdr) ? broadcast_pvdr.getCurrentData() : {"bcast_count": -1}
            original.titles[title.id] = title;
            delivered_count++;
        }
    }

    console.log("Current title w. bcast count:" + delivered_count);

    var output = JSON.parse(JSON.stringify(original));
    output.mdts = new Date().toJSON();
    if (!req.query.verbose) {
        if (output && output.titles) {
            var keys = Object.keys(output.titles);
            for (var t = 0; t < keys.length; t++) {
                var title = output.titles[keys[t]];
                if (title.header) delete title.header;
            }
        }
    }

    sendJSON(res, output);
});

router.get('/v1/titles/raw', function(req, res, next) {

    var original = {};
    original.titles = title_provider.get();

    // basically create a copy...
    var output = JSON.parse(JSON.stringify(original));
    output.mdts =new Date().toJSON();
    if (!req.query.verbose) {
        if (output && output.titles) {
            var keys = Object.keys(output.titles);
            for (var t = 0; t < keys.length; t++) {
                var title = output.titles[keys[t]];
                if (title.header) delete title.header;
            }
        }
    }

    sendJSON(res, output);
});


router.get('/v1/title/:title_id', function(req, res, next) {

    var original = {};
    original.title = title_provider.getTitle(req.params.title_id);
    var output = JSON.parse(JSON.stringify(original)); //clone object to keep cache intact
    if (!req.query.verbose) {
        if (output && output.title) {
            if (output.title.header) delete output.title.header;
        }
    }

    sendJSON(res, output);
});

router.get('/v1/broadcasts/:title_id', function(req, res, next) {

    var bcast_pvdr = getBroadcastProvider(req.params.title_id);
    if (!bcast_pvdr) {
        res.status(500).send('Internal Server Error - no provider for ' + req.params.title_id);
    }

    var orig = bcast_pvdr.get();
    var out = JSON.parse(JSON.stringify(orig)); //clone object to keep cache intact
    if (out.broadcasts) {
        out.broadcasts.sort(function (a, b) {
            var ad = new Date(a.start_time);
            var bd = new Date(b.start_time);
            return ad>bd ? -1 : ad<bd ? 1 : 0;
        });
    }
    if (!req.query.verbose) {
        if (out && out.broadcasts) {
            for (var b = 0; b < out.broadcasts.length; b++) {
                var bcast = out.broadcasts[b];
                if(bcast.header) delete bcast.header;
            }
        }
    }

    sendJSON(res, out);
});

router.get('/v1/members/:m_id', function(req, res, next) {
  var filename = 'data/members/' + req.params.m_id + '.json';
  sendJSON(res, getDataFromCache(filename, res));
});

router.get('/v1/heartbeat/:title_id/:bcast_id', function(req, res, next) {

  var broadcast_pvdr = BroadcastProvider.getInstance(req.elx.title.id);

  var session_id = req.get("s_id");
  if (!session_id || session_id == '') { session_id = utils.randomInt(2000000000, 1000000000); }

  if (broadcast_pvdr.player_heartbeat(req.params.bcast_id, session_id)) {
      utils.sendJSON(res, { result: "ok", messages: null });
  } else {
    req.elx.invalid_argument_name = "bcast_id";
    req.elx.invalid_argument_context = "Could not locate broadcast " + req.params.bcast_id + " for heartbeat player: " + session_id;
	next(new Error(req.elx.invalid_argument_context));
	return;
  }
});

// ---- HACKY UPDATE routes ---- //

router.get('/v1/broadcasts/:title_id/bcaston', function(req, res) {

  var msg = "bcast on - " + req.params.title_id;
  var bcast_pvdr = getBroadcastProvider(req.params.title_id);
  var bcast_count = -1;
  if (bcast_pvdr) {
    bcast_count = bcast_pvdr.broadcastOn(req.params.title_id, "3D");
  }
  var output = { "result": msg, "bcast_count": bcast_count }
  sendJSON(res, output);
});
router.get('/v1/broadcasts/:title_id/bcastoff', function(req, res) {

  var msg = "bcast off - " + req.params.title_id;
  var bcast_count = -1;
  var bcast_pvdr = getBroadcastProvider(req.params.title_id);
  if (bcast_pvdr) {
    bcast_count = bcast_pvdr.broadcastOff(req.params.title_id, "3D");
  }
  var output = { "result": msg, "bcast_count": bcast_count }
  sendJSON(res, output);
});

// ---- Helper Functions ---- //
function sendDataFromCache(cache_name, response) {

  var currentTime = Date.now();
  var data = getDataFromCache(cache_name);
  sendJSON(response, data);
}

function getDataFromCache(cache_name, response) {

  // console.log("cache_name: " + cache_name);

  if (!(cache_name in caches)) {

    if (!fs.existsSync(cache_name)) {
      response.status(404).send('Not Found');
      response.end();
      return null;
    }

    var fs_stats = fs.statSync(cache_name);
    if (!fs_stats || !fs_stats.isFile()) {
      response.status(500).send('Internal Server Error');
      response.end();
      return null;
    }

    // console.log('NotFound in cache.. adding');
    caches[cache_name] = new Cache(cache_name,
      function(data) {
          return data;
      },
      DEV_MODE
    );
  //    console.log("Initial data: " + caches[cache_name].getData());
  }

  var currentTime = Date.now();
  return caches[cache_name].getData();
}

function getBroadcastProvider(id) {

   if (!id) return null;
   return BroadcastProvider.getInstance(id);
}

function sendJSON(res, output) {
  if (output) {
    res.contentType('application/json');
    res.status(200).send(output);
  } else {
    res.status(200).send({});
  }
  res.end();
}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

// ---- STANDARD routes ---- //
router.get('/v', utils.sendVersion);
router.get('/favicon', utils.sendFavicon);
router.get('*', utils.sendIndex);

module.exports = router;
