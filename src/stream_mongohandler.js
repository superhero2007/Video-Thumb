var MongoClient = require('mongodb').MongoClient;
var collection_name = 'events';

function StreamMongoHandler() {

    this.connection_string = this.getConnectionString();
    console.log("StreamMongoHandler::ctor::connect string: " + this.connection_string);

    MongoClient.connect(this.connection_string).then(function(db) {
        var events = db.collection(collection_name);
        events.createIndex('header_object_type', {"header.object_type":1}, {background:true, w:1});
        events.createIndex('received_cdts', {"header.received_cdts":1}, {background:true, w:1});
        events.createIndex('created_by', {"header.created_by":1}, {background:true, w:1});
    }).catch(function(error) {
        console.log("Error connecting and insuring indices: " +  error);
    });
};

StreamMongoHandler.prototype.put = function(event_data) {

    MongoClient.connect(this.connection_string).then(function(db) {
        var col = db.collection(collection_name);
        col.insertOne(event_data).then(function(r) {
            db.close();
        }).catch(function(error) {
           	console.log("Error logging stream event: " + error);
            console.log(new Date() + "|StreamMongoHandler|put|" + JSON.stringify(event_data));
        });
  });
};

StreamMongoHandler.prototype.getConnectionString = function() {

    var mongoHost   = (process.env.MONGO_HOST)   ? process.env.MONGO_HOST   : "localhost";
    var mongoDbName = (process.env.MONGO_DBNAME) ? process.env.MONGO_DBNAME : "hplay";
    var mongoUser   = (process.env.MONGO_USER);
    var mongoPass   = (process.env.MONGO_PASS);
    var url = 'mongodb://';
    if (mongoUser) {
        url += mongoUser;
        if (mongoPass) { url += ':' + mongoPass; }
        url += '@'
    }
    url += mongoHost + '/' + mongoDbName;

    return url;
};

StreamMongoHandler.prototype.StreamMongoHandler = StreamMongoHandler;

module.exports = exports = StreamMongoHandler;
var stream_mongo_provider = null;

module.exports.getInstance = function() {
    if (null == stream_mongo_provider) {
        stream_mongo_provider = new StreamMongoHandler;;
    }
    return stream_mongo_provider;
};
