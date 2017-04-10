'use strict';

var fastload_provider = fastload_provider || require('./fastload_provider');
var VersionProvider = require('./version_provider');
var version_provider = new VersionProvider();

console.log('Loading fastload_handler');

if (process.env['LAMBDA_TASK_ROOT']) {
    process.env['PATH'] += ':' + process.env['LAMBDA_TASK_ROOT'];
    process.env['PATH'] += ':' + process.env['LAMBDA_TASK_ROOT'] + '/lambda/ext';
} else {
    process.env['PATH'] += ':' + process.cwd();
    process.env['PATH'] += ':' + process.cwd() + '/lambda/ext';
}

validateEnvironmentPercentValue('FASTLOAD_LOW_QUALITY_COMPRESSION_PERCENTAGE');
validateEnvironmentPercentValue('FASTLOAD_HIGH_QUALITY_COMPRESSION_PERCENTAGE');

exports.handler = (event, context, callback) => {

    var hrstart = process.hrtime();

    var request = JSON.parse(event.body);

    console.log("Processing Fastload Event:" + JSON.stringify(request));
//adding code here.
    fastload_provider.processImage(request.bucket_name, request.media_key)
        .then(function(results) {
            var hrend = process.hrtime(hrstart);
            var results_data = {
                num_events: 1,
                total_time_sec: hrend[0],
                total_time_ms: hrend[1]/1000000,
            };

            console.log("FastloadHandler|handler|Results: " + JSON.stringify(results));
            console.log("FastloadHandler|handler|Perf: " + JSON.stringify(results_data));
            var response = createAPIGatewaySuccessResponse(results);
            if (callback) {
                callback(null, response);
            } else if (context) {
                context.succeed(response);
            }
        })
        .catch(function(err){
            console.log('FastloadHandler|handler|Failed to process `' + request.media_key + '`' + '- ' + err);
            var err_obj = createAPIGatewayErrorResponse(err, request.media_key)
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

        return null;
};

exports.kinesis_handler = (event, context, callback) => {

    var start = new Date();
    var hrstart = process.hrtime();

//    console.log("Event:" + JSON.stringify(event));
//    console.log("Context: " + JSON.stringify(context));
    var event_promises = [];
    event.Records.forEach((record) => {
        // Kinesis data is base64 encoded so decode here
        const payload = new Buffer(record.kinesis.data, 'base64').toString('ascii');
//        console.log('Decoded payload:', payload);
        var request = JSON.parse(payload);

        event_promises.push(fastload_provider.processImage(request.bucket_name, request.media_key)
            .catch(function(err){
                console.log('FastloadHandler|handler|Failed to process `' + request.media_key + '`' + ': ' + err);
                throw err;
            }));
    });

    return Promise.all(event_promises).then(function() {
        var end = new Date() - start,
            hrend = process.hrtime(hrstart);
        var results_data = {
            num_events: event.Records.length,
            total_time_sec: hrend[0],
            total_time_ms: hrend[1]/1000000,
        };
        callback(null, results_data);
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

function validateEnvironmentPercentValue(variable) {

    if (!variable) { throw new Error("validateEnvironmentPercentValue() cannot take an empty or null variable name"); }

    if (isNaN(process.env[variable])
            || process.env[variable] < 0
            || process.env[variable] > 100) {

        console.log("FastloadProvider|validateEnvironmentPercentValue|Failed to configure a valid percentage for environment var `" + variable + "` : " + process.env[variable] );
        throw new Error("validateEnvironmentPercentVariable couldn't validate " + process.env[variable] + " and no default value was set");
    } else {
        console.log("FastloadProvider|validateEnvironmentPercentValue|" + variable + ": " + process.env[variable]);
    }
}