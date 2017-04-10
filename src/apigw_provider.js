var Promise = require('bluebird');
//var fs      = Promise.promisifyAll(require('fs'));
var fs      = require('fs');
var https   = require('https');
var AWS     = require('aws-sdk');
var zlib    = require('zlib');

var apiGwClientFactory = require('aws-api-gateway-client');

function APIGatewayProvider() {

    AWS.config.region = (process.env.AWS_REGION) ? (process.env.AWS_REGION) : 'us-east-1';
    AWS.config.setPromisesDependency(require('bluebird'));
    console.log("APIGatewayProvider|ctor|AWS_REGION: " + AWS.config.region);

    this.getConfig = function(uri) {
        return {
            invokeUrl: uri,
            accessKey: process.env.AWS_ACCESS_KEY_ID,
            secretKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: AWS.config.region
        };
    };
};

/**
 *  `params` is where any header, path, or querystring request params go. The key is the parameter named as defined in the API
 *  `path` syntax follows url-template https://www.npmjs.com/package/url-template
 *  `method` one of POST, GET, PUT, DELETE
 *  `body` what to actually submit
 */
APIGatewayProvider.prototype.get = function(uri, params, path, method, body) {
    console.log("APIGatewayProvider|get|Called " + method + " with " + uri + path);
    var config = this.getConfig(uri);

//    console.log("DONT LEAVE THIS IN: " + JSON.stringify(config));

    var apiGwClient = apiGwClientFactory.newClient(config);

    var params = {};
    //
    var pathTemplate = path
    var method = method;
    var additionalParams = {
        //If there are any unmodeled query parameters or headers that need to be sent with the request you can add them here
//        headers: {
//            param0: '',
//            param1: ''
//        },
//        queryParams: {
//            param0: '',
//            param1: ''
//        }
    };

    return apiGwClient.invokeApi(params, pathTemplate, method, additionalParams, body);
};


APIGatewayProvider.prototype.APIGatewayProvider = APIGatewayProvider;

var apigateway_provider = module.exports = exports = Promise.promisifyAll(new APIGatewayProvider());
