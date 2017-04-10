var express = require('express');
var router = express.Router();
var utils = require('../utilities')
var HeloCoordinator = require('../helo_coordinator');
var helo_coordinator = new HeloCoordinator();

router.get('/v1/', function(req, res, next) {

    var session_id = req.get('s_id');
    var config = helo_coordinator.doit(session_id);
    config.session.connect_urls = [req.protocol + "://" + req.hostname];

    res.contentType('application/json');
    res.send(config);
});

// ---- STANDARD routes ---- //
router.get('/v', utils.sendVersion);
router.get('/favicon', utils.sendFavicon);
router.get('*', utils.sendIndex);


module.exports = router;
