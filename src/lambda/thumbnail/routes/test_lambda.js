var express = require('express');
var router  = express.Router();
var utils   = require('../utilities');
var multer  = require('multer');
var fs      = require('fs');
var upload  = multer({ dest: '/tmp' });

var event_handler = require('../video_thumbnail_handler');

router.use(utils.initElxObject);

router.get('/v1/thumbnail_apigw/:bucket/:key', function(req, res, next) {

     var event = {
        "resource": "/thumbnail",
        "path": "/thumbnail",
        "httpMethod": "POST",
        "headers": null,
        "queryStringParameters": null,
        "pathParameters": null,
        "stageVariables": null,
        "requestContext": {
            "accountId": "976063035409",
            "resourceId": "oz0c80",
            "stage": "test-invoke-stage",
            "requestId": "test-invoke-request",
            "identity": {
                "cognitoIdentityPoolId": null,
                "accountId": "976063035409",
                "cognitoIdentityId": null,
                "caller": "976063035409",
                "apiKey": "test-invoke-api-key",
                "sourceIp": "test-invoke-source-ip",
                "cognitoAuthenticationType": null,
                "cognitoAuthenticationProvider": null,
                "userArn": "arn:aws:iam::976063035409:root",
                "userAgent": "Apache-HttpClient/4.5.x (Java/1.8.0_102)",
                "user": "976063035409"
            },
            "resourcePath": "/thumbnail",
            "httpMethod": "POST",
            "apiId": "3benx9arya"
        },
        "body": "{\"bucket_name\":\"" + req.params.bucket + "\",\"media_key\":\"" + req.params.key + "\"}"
    };

    console.log("Processing API Gateway video_thumbnail event: " + JSON.stringify(event));

    var callback = function(error, object) {
        if (error) {
            res.status(500).send(error).end();
        } else {
            res.status(object.statusCode);
            res.jsonp(object);
        }
    };

    var context = {
        succeed: function(response) {
            console.log("returning: " + JSON.stringify(response));
            res.jsonp(response).end();
        },
        done: function(foo, response) {
            console.log("response: " + JSON.stringify(response));
            res.status(response.status_code).jsonp(response).end();
        },
        fail: function(error) {
            console.log("error: " + JSON.stringify(error));
            res.status(500).send(error).end();
        }
    };

    try {
        var result = event_handler.handler(event, null, callback);
    } catch (err) {
        console.log("try catcher: " + err);
        console.log("stack: " + err.stacks);
        res.status(500).send(err).end();
    }


});

module.exports = router;
