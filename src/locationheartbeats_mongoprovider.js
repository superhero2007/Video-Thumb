function LocationHeartbeatMongoProvider() {
    this.LocationHeartbeat = require('./models/location_heartbeat');
};

LocationHeartbeatMongoProvider.prototype.put = function(location_id, user_id, display_name) {
        return this.LocationHeartbeat.findOneAndUpdate(
            { location_id: location_id, user_id: user_id },
            { location_id: location_id, user_id: user_id, display_name: display_name, heartbeat_time: Date.now() },
            { upsert: true, setDefaultsOnInsert: true, new: true }
          ).exec().then(function(doc) {
            return doc;
        });
    };

LocationHeartbeatMongoProvider.prototype.get = function(location_id, user_id, display_name) {
        return this.LocationHeartbeat.findOneAndUpdate(
            { location_id: location_id, user_id: user_id },
            { location_id: location_id, user_id: user_id, display_name: display_name, heartbeat_time: Date.now() },
            { upsert: true, setDefaultsOnInsert: true, new: true }
          ).exec().then(function(doc) {
            return doc;
        });
    };

LocationHeartbeatMongoProvider.prototype.countByLocation = function(location_id) {
        return this.LocationHeartbeat.count(
            { location_id: location_id }
          ).exec().then(function(count) {
            return { location_id: location_id, count: count };
        });
    };

LocationHeartbeatMongoProvider.prototype.LocationHeartbeatMongoProvider = LocationHeartbeatMongoProvider;

module.exports = exports = LocationHeartbeatMongoProvider;
var location_heartbeat_mongo_provider = null;

module.exports.getInstance = function() {
    if (null == location_heartbeat_mongo_provider) {
        location_heartbeat_mongo_provider = new LocationHeartbeatMongoProvider;;
    }
    return location_heartbeat_mongo_provider;
}
