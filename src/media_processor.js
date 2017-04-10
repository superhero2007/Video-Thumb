var fs = require('fs');
var md5 = require('md5');
var utils = require('./utilities');
var lambda_utils = require("./lambda/lambda_utils");
var media_provider = media_provider || require('./media_provider');
var fastload_client = fastload_client || require('./fastload_client');
var video_thumbnail_client = video_thumbnail_client || require('./video_thumbnail_client');

media_provider.useMongoProvider();

var allowed_mimes = {
    'image/jpeg':      'jpg',
    'image/png':       'png',
    'image/bmp':       'bmp',
    'image/tiff':      'tif',
    'image/gif':       'gif',
    'audio/mpeg3':     'mp3',
    'audio/mp3':       'mp3',
    'audio/x-mpeg3':   'mp3',
    'audio/oga':       'ogg',
    'audio/ogg':       'ogg',
    'audio/ogv':       'ogg',
    'audio/flac':      'flac',
    'audio/wav':       'wav',
    'audio/aif':       'aif',
    'audio/aiff':      'aif',
    'audio/x-aiff':    'aif',
    'audio/aif':       'aif',
    'video/avi':       'avi',
    'video/mov':       'mov',
    'video/mp4':       'mp4',
    'video/mpeg':      'mpg',
    'video/mpeg':      'mpg',
    'video/quicktime': 'qt'
};

var allowed_asset_types = [
  'audio', 'video', 'video3d', '360', '360s', 'VRM', 'VRS', 'image'
];

function MediaProcessor() {

    this.media_dir_mode = (process.env.MEDIA_DIR_MODE)     ? (process.env.MEDIA_DIR_MODE)     : "LOCAL";
    console.log("MediaProcessor|ctor|MEDIA_DIR_MODE: " + this.media_dir_mode);
    this.content_path   = (process.env.MEDIA_CONTENT_PATH) ? (process.env.MEDIA_CONTENT_PATH) : "data";
    console.log("MediaProcessor|ctor|MEDIA_CONTENT_PATH: " + this.content_path);

    // Set the file handler type (local or S3)
    if (this.media_dir_mode == "LOCAL" || !this.media_dir_mode) {
        console.log("MediaProcessor|ctor|Configured in LOCAL file storage mode");
        this.media_handler = function(tmp_path, media_data) {
            var new_path = this.content_path + '/' + media_data.media_id + '.' + allowed_mimes[media_data.mime_type];
            return utils.copyFile(tmp_path, new_path).then(function() {
                media_data.stored_filename = new_path;
                return media_data;
            });
        };
    } else if (this.media_dir_mode == "S3") {
        if  (!process.env.AWS_ACCESS_KEY_ID) {
            throw new Error("MediaProcessor configured for S3, but missing env var `AWS_ACCESS_KEY_ID`");
        }
        if  (!process.env.AWS_SECRET_ACCESS_KEY) {
            throw new Error("MediaProcessor configured for S3, but missing env var `AWS_SECRET_ACCESS_KEY`");
        }

        var bucket_name = (process.env.MEDIA_S3_BUCKET) ? (process.env.MEDIA_S3_BUCKET) : "hashplay-filestorage";
        console.log("MediaProcessor|ctor|MEDIA_S3_BUCKET: " + bucket_name);
        console.log("MediaProcessor|ctor|AWS_CLOUDFRONT_URL: " + process.env.AWS_CLOUDFRONT_URL);

        this.media_handler = Promise.promisify(function s3_media_handler(tmp_path, media_data) {

            var content_path = (process.env.MEDIA_CONTENT_PATH) ? (process.env.MEDIA_CONTENT_PATH) : "data";
            var new_path = content_path + '/' + media_data.media_id + '.' + allowed_mimes[media_data.mime_type];
            var s3_provider = require('./s3_provider');

            console.log("s3_provider putting to S3 bucket " + bucket_name);
            s3_provider.putFile(bucket_name, new_path, tmp_path, media_data.mime_type, false, function(s3_details) {
                console.log("s3_provider finished " + JSON.stringify(s3_details));
                console.log("s3_provider media: " + JSON.stringify(media_data));
                media_data.status = "active";
                media_data.stored_filename = new_path;
                media_data.bucket_name = bucket_name;
                return media_provider.put(media_data)
                    .then(postPutFileHandler);
            });

            return media_data;
        });
    } else {
        throw new Error("MediaProcessor configuration error. `" + this.media_dir_mode + "` is not a valid media_dir_mode value");
    }
};

function postPutFileHandler(document) {
     if ("360" == document.asset_type ||
         "360s" == document.asset_type) {
            console.log("MediaProcessor|postPutFileHandler|Generate Fastload Images for: " + document.stored_filename);
            fastload_client.processImages(document.bucket_name, document.stored_filename)
                .then(function(result) {
                    var content_path = (process.env.MEDIA_CONTENT_PATH) ? (process.env.MEDIA_CONTENT_PATH) : "data";
                    document.fastload = {
                        full_lores_id: content_path + '/' + result.full_lores,
                        middle_id: content_path + '/' + result.middle,
                        left_id: content_path + '/' + result.left,
                        right_id: content_path + '/' + result.right
                    };

                    // TODO: yes, a second put, but the first was before fastload happened
                    // another, probably better solution would be to have a prePut handler
                    // that decorates the document and then puts once done.
                    media_provider.put(document)
                        .then(function(result) {
                            console.log("MediaProcessor|postPutFileHandler|Stored " + document.media_id + " with fastload object");
                            return result;
                        })
                        .catch(function(error) {
                            const util = require('util');
                            console.log(util.inspect(error, false, null));
                            throw error;
                        });
                }).catch(function(error) {
                    console.log("MediaProcessor|postPutFileHandler|fastload process images FAILED");
                    if (error.response) {
                        console.log("MediaProcessor|postPutFileHandler|Failed to generate fastload images, response code was: " + error.response.status);
                    } else {
                        const util = require('util');
                        console.log(util.inspect(error, false, null));
                        throw error;
                    }
                });
     } else if ("video" == document.asset_type) {
         console.log("MediaProcessor|postPutFileHandler|Generate video thumbnail image for: " + document.stored_filename);
         video_thumbnail_client.processVideo(document.bucket_name, document.stored_filename)
             .then(function(result) {

                 if (!result) { throw Error("processVideo returned a null document, which it shouldn't have.  Check Lambda logs for video thumbnail generation"); }

                 media_data = lambda_utils.parseKey(result.media_key);
                 console.log("processVideo result: " + JSON.stringify(result));
                 console.log("media_data: " + JSON.stringify(media_data));
                 // Create a new media document, the file already lives wherever it should be stored
                 var thumbnail_data = create_media_document(
                     media_data.filename + "_thumb",
                     media_data.filename + "_thumb",
                     document.owner,
                     result.mime_type,
                     result.asset_type,
                     result.display_image,
                     null,
                     result.size_bytes,
                     document.submission_ip
                 );

                 thumbnail_data.status = "active";
                 thumbnail_data.stored_filename = media_data.media_path + "/" + media_data.file_path;

                 console.log("MediaProcessor|postPutFileHandler|Adding media document for thumbnail: " + JSON.stringify(thumbnail_data));
                 media_provider.put(thumbnail_data);

                 result.thumbnail_id = thumbnail_data.media_id
                 return result;
             }).then(function(result) {
                 document.thumbnail_id = result.thumbnail_id;

                 // TODO: yes, a second put, but the first was before video upload happened
                 // another, probably better solution would be to have a prePut handler
                 // that decorates the document and then puts once done here.
                 media_provider.put(document)
                     .then(function(result) {
                         console.log("MediaProcessor|postPutFileHandler|Stored " + document.media_id + " with thumbnail");
                         const util = require('util');
                         console.log(util.inspect(document, false, null));
                         return result;
                     })
                     .catch(function(error) {
                         const util = require('util');
                         console.log(util.inspect(error, false, null));
                         throw error;
                     });
             }).catch(function(error) {
             console.log("MediaProcessor|postPutFileHandler|video thumbnail image generation FAILED");
             if (error.response) {
                 console.log("MediaProcessor|postPutFileHandler|Failed to generate thumbnail for video, response code was: " + error.response.status);
             } else {
                 const util = require('util');
                 console.log(util.inspect(error, false, null));
                 throw error;
             }
         });
     }

     return document;
}

MediaProcessor.prototype.parseMediaData = function(req) {

    validate_type(req.file.mimetype, Object.keys(allowed_mimes), "Mime Type");
    validate_type(req.body.asset_type, allowed_asset_types, "Asset Type");

    var media_data = parse_media_data(req);
    if (!this.media_handler) {
        throw new Error("Media handler is not defined, cannot process media upload. This will not fix itself");
    }

    var media_hdlr = this.media_handler;
    return media_provider.put(media_data).then(function(document) {
       var result = media_hdlr(req.file.path, media_data);
       return document;
    });
};

// TODO: Move this to MediaProvider once media provider is accessible from the media processor
//  Possibly make the media processor actually take in the processor and not the other way around.
MediaProcessor.prototype.archive = function(media_id, requestor_id) {

    var promise = media_provider.archive(media_id, requestor_id);
    return promise.then(function(media) {
        // Set the file handler type (local or S3)
        var media_dir_mode = (process.env.MEDIA_DIR_MODE)     ? (process.env.MEDIA_DIR_MODE)     : "LOCAL";
        if (media_dir_mode == "LOCAL" || !media_dir_mode) {
            throw new Error("Local mode file deletion not supported")
        } else if (media_dir_mode == "S3") {
            var bucket_name = (process.env.MEDIA_S3_BUCKET) ? (process.env.MEDIA_S3_BUCKET) : "hashplay-filestorage";
            var s3_provider = require('./s3_provider');
            return s3_provider.deleteFile(bucket_name, media.stored_filename, function(err, data) {
                        if (err) console.log("Error trying to delete " + file_key + " from bucket " + bucket + " - " + err, err.stack); // an error occurred
            });
        }
    });
};


// ---- Helper Functions ---- //
function parse_media_data(req) {

    var owner = req.body.owner;

    if (!owner) {
        const util = require('util');
        console.log("MediaProcessor|parse_media_data|owner not valid for request: " + util.inspect(req, false, null));
        throw new Error("`owner` not valid in media POST body");
    }

    // TODO: add some code to verify the owner vs. the session object.

    // make sure the owner doesn't have any invalid characters before we make it a filename
    var media_id = owner.replace(/([^a-z0-9\-]+)/gi, '_') + "_" + Date.now();
    var media_name = req.body.name;
    if (!media_name) {
        media_name = media_id;
    }

    if (!req.file.originalname) {
        console.log("MediaProcessor|parse_media_data|`originalname` not defined on req.file");
        throw new Error("`originalname` not set, problem with POST data");
    }

    return create_media_document(
        media_id,
        media_name,
        owner,
        req.file.mimetype,
        req.body.asset_type,
        req.file.originalname,
        req.body.thumbnail_id,
        req.file.size,
        req.clientIp
    );

};

function create_media_document(
    media_id,
    media_name,
    owner,
    mime_type,
    asset_type,
    original_name,
    thumbnail_id,
    size_bytes,
    submission_ip) {

    if  (!media_id) { throw Error("Missing or null media_id to create_media_document"); }
    if  (!media_name) { throw Error("Missing or null media_name to create_media_document"); }

        //Construct the db entry and save record
        return {
            media_id: media_id,
            name: media_name,
            owner: owner,
            mime_type: mime_type,
            asset_type: asset_type,
            original_filename: original_name,
            thumbnail_id: thumbnail_id,
            size: size_bytes,
            submission_ip: submission_ip
        };
}

function validate_type(type, allowed_types, description) {
  if (!type) {
    console.log(description + " not defined");
    throw new Error(description + " not defined");
  }

  if (allowed_types.indexOf(type) == -1) {
    console.log(description + " of " + type + " is not allowed");
    throw new Error(description + " not allowed/supported: " + type);
   }
}

function load_config() {
    var server_config = null;
    var static_config_file = './server_config.json';
    if (!fs.statSync(static_config_file).isDirectory()) {
        config_data = fs.readFileSync(static_config_file, 'utf-8');
        if (config_data) {
             server_config = JSON.parse(config_data);
        } else {
            console.log('Failed to parse config JSON from ' + static_config_file + ". This is bad.");
        }
    }
    return server_config;
}

MediaProcessor.prototype.MediaProcessor = MediaProcessor;

var Promise = require('bluebird');
var media_processor = module.exports = exports = Promise.promisifyAll(new MediaProcessor());
