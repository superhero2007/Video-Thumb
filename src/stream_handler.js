var utils = require('./utilities');
var mongoProvider = require('./stream_mongohandler');
var keenProvider  = require('./keen_provider');

function StreamHandler() {
    var keen_collection_name = (process.env.KEEN_STREAM_COLLECTION_NAME) ? process.env.KEEN_STREAM_COLLECTION_NAME : 'log';
    this.keen_provider = keenProvider.getInstance(keen_collection_name);
    this.provider_impl = mongoProvider.getInstance();
};

StreamHandler.prototype.process = function(session_id, data) {

    if (!session_id) {
       var err = new Error('invalid argument `session_id`');
       err.name = "invalid_argument";
       err.message = "the processing of stream events requires a session id and that was missing.";
       throw err;
    }

    console.log("Handling stream event for session: " + session_id);

    if (!data) {
       var err = new Error('invalid argument `data`');
       err.name = "invalid_argument";
       err.message = "the processing of stream events requires a json body with event information, and that was missing or non-existent";
       throw err;
    }

    this.validateHeader(data);

    // now do something smart with it, like sticking it on kinesis, or putting it into dynamodb.
    data.header.created_by = session_id;
    data.header.received_cdts = Date.now();

    this.keen_provider.add(data);
    return this.provider_impl.put(data);
};

// TODO: There is a better way to do callbacks for validation in node but I'm so tired
StreamHandler.prototype.validateHeader = function(data) {

    if (!data.header) {
       var err = new Error('invalid argument. missing event header');
       err.name = "invalid_argument";
       err.message = "the processing of stream events requires an event header, which was not found";
       throw err;
    }

    var header = data.header;

    if (!header.object_type) {
       var err = new Error('invalid argument. missing header.object_type');
       err.name = "invalid_argument";
       err.message = "the processing of stream events requires header.object_type, which was not found";
       throw err;
    }

    if (!header.cdts) {
       var err = new Error('invalid argument. missing header.cdts');
       err.name = "invalid_argument";
       err.message = "the processing of stream events requires header.cdts, which was not found";
       throw err;
    }

    // TODO: Add some parsing here of the CDTS to add some more values to the header
    // to make querying easier.  YEAR/MONTH/DAY/HOUR/MINUTE
};

StreamHandler.prototype.StreamHandler = StreamHandler;

var Promise = require('bluebird');
var stream_handler_provider = module.exports = exports = Promise.promisifyAll(new StreamHandler());
