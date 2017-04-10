var express = require('express');
var cors    = require('cors');
var router  = express.Router();
var utils   = require('../utilities');
var multer  = require('multer');
var fs      = require('fs');
var upload  = multer({ dest: '/tmp' });

var media_processor = media_processor || require('../media_processor');
var media_provider  = media_provider  || require('../media_provider');
media_provider.useMongoProvider();
//var event_handler   = require('../lambda/fastload_handler');

router.use(utils.initElxObject);

// TODO: make this use paging, or admin only. this will eventually be a really bad API (slow)
router.get('/v1/media', cors(), function(req, res, next) {
    if (!utils.sessionCheck(req)) return;
    var promise = media_provider.getAll(req.params.id, req.get('include_deleted'));
    promise.then(function(media) {
        sendResolvedMedia(req, res, media);
    }).catch(function(err){
        next(err);
    });
});

router.get('/v1/media/creator/:id', cors(), function(req, res, next) {
    if (!utils.sessionCheck(req)) return;
    var promise = media_provider.getByUser(req.params.id, req.get('include_deleted'));
    promise.then(function(media) {
        sendResolvedMedia(req, res, media);
    }).catch(function(err){
        next(err);
    });
});

router.get('/v1/media/:id', cors(), function(req, res, next) {
    if (!utils.sessionCheck(req)) return;
    var promise = media_provider.getById(req.params.id, req.get('include_deleted'));
    promise.then(function(media) {
        res.jsonp(resolveAssetUrls(req, media));
    }).catch(function(err){
        next(err);
    });
});

router.get('/v1/render/:id', cors(), function(req, res, next) {

    var promise = media_provider.getById(req.params.id, req.get('include_deleted'));
    promise.then(function(media) {
        if (media) {
            res.writeHead(200, {
                'Content-Type': media.mime_type,
                'Content-Length': media.size
            });

            var stream = fs.createReadStream(media.stored_filename, {bufferSize: 64 * 1024})
            stream.pipe(res);

            stream.on('error', function(err){
                console.log("Error streaming " + media.stored_filename + ': ' + err);
            });
            stream.on('close', function(){
            });
        } else {
            utils.sendNotFound(res);
        }
    }).catch(function(err){
        next(err);
    });
});

router.post('/v1/media', cors(), upload.single('file'), function(req, res, next) {

  if (!utils.sessionCheck(req)) return;

  if (!req.file) {
      res.status(500).send({ error: 'no file selected'}).end();
      return 1;
  }

  var promise = media_processor.parseMediaData(req);
  promise.then(function(media) {
        sendJSON(res, resolveAssetUrls(req, media));
    }).catch(function(err) {
        console.log("Error during new media import request: " + err);
        next(err);
//        res.status(500).send({error: error}).end();
    });
});

router.delete('/v1/media/:id', cors(), function(req, res, next) {

    if (!utils.sessionCheck(req)) return;

    // figure out who is sending the request
    var requesting_user = req.get('user_id');
    if (!requesting_user && req.session) {
        requesting_user = req.session.user_id;
    }
    if (!requesting_user) {
        req.elx.invalid_argument_name = 'user_id';
        req.elx.invalid_argument_context = "`user_id` not found in the headers.  Cannot delete asset " + req.params.id;
        next(new Error('invalid_argument'));
        return;
    }

    var promise = media_processor.archive(req.params.id, requesting_user);
    promise.then(function(result) {
        if (!result) {
            res.status(404).send().end();
        } else  {
            sendJSON(res, { status: "archived", location: req.originalUrl });
        }
    }).catch(function(err){
        next(err);
    });
});


// TODO: move this to media_processor and make it configurable rather than using
// the current local server
function resolveMediaUrl(req, media) {

    if (!(media.status == "active" || media.status == "deleted"))
       return '';

    if ("S3" == process.env.MEDIA_DIR_MODE) {
        return process.env.AWS_CLOUDFRONT_URL + '/' + media.stored_filename;
    }

    return 'http://' + req.headers.host + '/med/v1/render/' + media.media_id;
};

function resolveAssetUrls(req, media) {
    if (!media) { return null; }

    var media_obj = media.toObject();
    media_obj.url = resolveMediaUrl(req, media_obj);

    // remove some stuff we dont want returned
    delete media_obj._id;
    delete media_obj.__v;
    delete media_obj.stored_filename;

    return media_obj;
}

function sendResolvedMedia(req, res, media) {
    medias = [];
    for (var i in media.medias) {
        var resolved_media = resolveAssetUrls(req, media.medias[i]);
        medias.push(resolved_media);
    }
    media.medias = medias;
    res.jsonp(media);
}

// ---- STANDARD routes ---- //
router.get('/v', utils.sendVersion);
router.get('/favicon', utils.sendFavicon);
router.get('*', utils.sendIndex);

module.exports = router;
