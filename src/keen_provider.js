var Promise = require('bluebird');
var KeenClient = require("keen-js");

function KeenProvider(collection_name) {

    var client_settings = this.getClientSettings();
    console.log("KeenProvider::ctor::client_settings:" + JSON.stringify(client_settings));
    console.log("KeenProvider::ctor::collection_name:" + collection_name);
    this.client = new KeenClient(client_settings);
    this.collection_name = collection_name;
};

KeenProvider.prototype.add = function(event_data) {
    this.client.addEvent(this.collection_name, event_data, function(err, res) {
       if (err) {
           console.log("Error sending to keen.io: " + JSON.stringify(err));
           console.log(JSON.stringify(event_data));
       }
    });
};

KeenProvider.prototype.getClientSettings = function() {

    var projectId = (process.env.KEEN_PROJECT_ID) ? process.env.KEEN_PROJECT_ID : '578141d333e40619c9916c55';
    var writeKey  = (process.env.KEEN_WRITE_KEY)  ? process.env.KEEN_WRITE_KEY  : '1847e90dd958cdf6316160e8ec6927865f3a2b70d7aaa440535a2a2538a08a58d631365fef67a45d70d3b93471f753508717e14a2311ed71b6d4316cff4555c0d75778f2bb511d432f4c945cfa36cd391ffbd9d0a1f13eba0facbd066a26325c';

    return { 'projectId': projectId, 'writeKey': writeKey};
};

KeenProvider.prototype.KeenProvider = KeenProvider;

module.exports = exports = KeenProvider;
var keen_provider = null;

module.exports.getInstance = function(collection_name) {
    if (null == collection_name || '' == collection_name) {
        throw new Error("Cannot create an instance of the KeenProvider without specifying a valid collection name");
    }

    if (null == keen_provider) {
        keen_provider = Promise.promisifyAll(new KeenProvider(collection_name));
    }
    return keen_provider;
};
