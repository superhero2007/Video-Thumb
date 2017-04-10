var mongoose     = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var Schema       = mongoose.Schema;

var locationHeartbeatSchema = new Schema({
    location_id:                { type: String, required: true },
    user_id:                    { type: String, required: true },
    display_name:               { type: String, required: false },
    heartbeat_time:             { type: Date,   required: true, default: Date.now }
});

// schema level indices
locationHeartbeatSchema.index({ location_id: 1 });
locationHeartbeatSchema.index({ user_id: 1 });
locationHeartbeatSchema.index({ heartbeat_time: 1}, { expireAfterSeconds: 15 });
locationHeartbeatSchema.plugin(findOrCreate);

if (!locationHeartbeatSchema.options.toObject) locationHeartbeatSchema.options.toObject = {};
locationHeartbeatSchema.set('toObject', { virtuals: false });
locationHeartbeatSchema.options.toObject.transform = function (doc, ret, options) {
  // remove the _id of every document before returning the result
  delete ret._id;
}

var LocationHeartbeat = mongoose.model('LocationHeartbeat', locationHeartbeatSchema);

module.exports = LocationHeartbeat;
