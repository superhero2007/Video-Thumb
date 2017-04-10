var Promise = require('bluebird');
var apigateway_provider = apigateway_provider || require('./apigw_provider');

function FastloadClient() {
    this.configure();
};

FastloadClient.prototype.processImages = function(bucket_name, media_key) {
    var request = {
        bucket_name: bucket_name,
        media_key: media_key
    };

    var config = this.configure();
    console.log("FastloadClient|processImages|Processing: " + bucket_name + ":" + media_key);

    return apigateway_provider.get(config.uri, null, config.path, "POST", request)
        .then(function(results) {
            return results.data;
        }).catch(function(error) {
            const util = require('util');
            console.log("FastloadClient|processImages|Error trying to generate fastload images: " + util.inspect(error, false, null));
            throw error;
        });
};

FastloadClient.prototype.configure = function() {
    var uri = process.env.FASTLOAD_GENERATE_URI;
    var path = process.env.FASTLOAD_PATH ? process.env.FASTLOAD_PATH : "/fastload";
    console.log("FastloadClient|configure|FASTLOAD_GENERATE_URI: " + uri);
    console.log("FastloadClient|configure|FASTLOAD_PATH: " + path);

    return { uri: uri, path: path };
};

FastloadClient.prototype.FastloadClient = FastloadClient;

var fastload_client = module.exports = exports = Promise.promisifyAll(new FastloadClient());
