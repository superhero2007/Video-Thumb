/*jslint node: true */
"use strict";

var video_thumbnail_provider = video_thumbnail_provider || require('./video_thumbnail_provider');
var VersionProvider = require('./version_provider');
var version_provider = new VersionProvider();

console.log('Loading video_thumbnail_handler');

if (process.env['LAMBDA_TASK_ROOT']) {
    process.env['PATH'] += ':' + process.env['LAMBDA_TASK_ROOT'];
    process.env['PATH'] += ':' + process.env['LAMBDA_TASK_ROOT'] + '/lambda/ext';
} else {
    process.env['PATH'] += ':' + process.cwd();
    process.env['PATH'] += ':' + process.cwd() + '/lambda/ext';
}

exports.handler = (event, context, callback) => {

    var hrstart = process.hrtime();

    var request = JSON.parse(event.body);

    console.log("VideoThumbnailHandler|handler|Processing Thumbnail Event:" + JSON.stringify(request));

    video_thumbnail_provider.processVideo(request.bucket_name, request.media_key)
        .then(function(results) {
            var hrend = process.hrtime(hrstart);
            var results_data = {
                num_events: 1,
                total_time_sec: hrend[0],
                total_time_ms: hrend[1]/1000000,
            };

            console.log("VideoThumbnailHandler|handler|Results: " + JSON.stringify(results));
            console.log("VideoThumbnailHandler|handler|Perf" + JSON.stringify(results_data));
            var response = createAPIGatewaySuccessResponse(results);
            if (callback) {
                callback(null, response);
            } else if (context) {
                context.succeed(response);
            }
        })
        .catch(function(err){
            console.log('VideoThumbnailHandler|handler|Thumbnail API Gateway Handler: failed to process `' + event.media_key + '`' + '- ' + err);
            var err_obj = createAPIGatewayErrorResponse(err, event.media_key);
            if (callback) {
                if (err_obj.statusCode) {
                    callback(null, err_obj);
                } else {
                    callback(err_obj, null);
                }
            } else if (context) {
                if (err_obj.statusCode) {
                    context.done(null, err_obj);
                } else {
                    context.fail(err_obj);
                }
            } else {
                throw err;
            }
        });
};



function createAPIGatewaySuccessResponse(json_body, status_code, headers) {

    status_code = (!status_code) ? 200 : status_code;
    var response = {
        statusCode: status_code,
        headers: {},
        body: JSON.stringify(json_body)
    };

    if (headers) {
        // do something here to add headers when we need them
    }

    return response;
}

function createAPIGatewayErrorResponse(err, media_key) {

    if (err.code) {
        if (err.code == "NoSuchKey") {
            var response = { key: media_key, message: err.message };
            return createAPIGatewaySuccessResponse(response, 404);
        }
    }

    return {
        statusCode: 500,
        headers: {},
        body: JSON.stringify({
            type: "error",
            code: -311,
            message: (err.message) ? err.message : err,
            stack: (err.stack) ? err.stack : 'n/a'
        })
    };
}