var Promise = require('bluebird');
var apigateway_provider = apigateway_provider || require('./apigw_provider');

function VideoThumbnailClient() {
    this.configure();
};

VideoThumbnailClient.prototype.processVideo = function(bucket_name, media_key) {
    var request = {
        bucket_name: bucket_name,
        media_key: media_key
    };

    var config = this.configure();
    console.log("VideoThumbnailClient|processVideo|Processing: " + bucket_name + ":" + media_key);

    // return new Promise(function(resolve) {
    //     var lambda_utils = require("./lambda/lambda_utils");
    //     media_data = lambda_utils.parseKey(request.media_key);
    //     var thumbnail_key = media_data.media_path + "/" + media_data.filename + ".jpg";
    //         resolve(
    //             {
    //                 "media_key": thumbnail_key,
    //                 "display_image":"https://hashplay-capi-dev.s3.amazonaws.com/" + thumbnail_key,
    //                 "mime_type":"image/jpeg",
    //                 "asset_type":"image",
    //                 "size_bytes":406382,
    //                 "key_frames":null
    //             });
    //     });
   return apigateway_provider.get(config.uri, null, config.path, "POST", request)
       .then(function(results) {
           return results.data;
       }).catch(function(error) {
           const util = require('util');
           console.log("VideoThumbnailClient|processImages|Error trying to generate video thumbnail image: " + util.inspect(error, false, null));
           throw error;
       });
};

VideoThumbnailClient.prototype.configure = function() {
    var uri = process.env.VIDEO_THUMBNAIL_GENERATE_URI;
    var path = process.env.VIDEO_THUMBNAIL_PATH ? process.env.VIDEO_THUMBNAIL : "/videothumb";
    console.log("VideoThumbnailClient|configure|VIDEO_THUMBNAIL_GENERATE_URI: " + uri);
    console.log("VideoThumbnailClient|configure|VIDEO_THUMBNAIL_PATH: " + path);

    return { uri: uri, path: path };
};

VideoThumbnailClient.prototype.VideoThumbnailClient = VideoThumbnailClient;

var video_thumbnail_client = module.exports = exports = Promise.promisifyAll(new VideoThumbnailClient());
