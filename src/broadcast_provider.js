var utils = require('./utilities');

var b_cache = {}; //used for 3D

//TODO: uncomment when Mongo-ready
//var dbProvider = require('./broadcast_mongoprovider');
//var db_data_provider = new dbProvider();
var md5 = require('md5');

var player_ping_cache = {};
var instance_caches = {}; //BroadcastProvider(name) cache


function BroadcastProvider(name) {
    this.title_name = name;
    this.live_broadcast_cache = [];
    this.vod_cache = null;
}

BroadcastProvider.prototype.getCurrentData = function () {

        var data = {
            'count_2D': 0,
            'count_3D': 0,
            'count_VR': 0
        };

        // process any vod/static data
        var broadcasts = this.get().broadcasts;
        var viewer_count = 0;

        if (broadcasts) {
            for (var i = 0; i < broadcasts.length; i++) {
                var broadcast = broadcasts[i];
                if (includeInCounts(broadcast)) {
                    var fmt = broadcast.format;
                    if (fmt == "2D") {
                        data.count_2D++;
                    } else if (fmt == "VR") {
                        data.count_VR++;
                    } else {
                        data.count_3D++;
                    }
                }
            }
        }

        if (this.name() in b_cache) {
            data.count_3D = b_cache[name];
        }

        data.bcast_count = data.count_2D + data.count_3D + data.count_VR;
        var d = new Date();
        d.setSeconds(d.getSeconds() - utils.randomInt(0, 180));
        data.mdts = d;

        return data;
    };

function includeInCounts(broadcast) {
    var rtn = false;

    //hitbox publishers should be counted
    rtn = (broadcast.provider === "hitbox");

    if (!rtn) {
        //include all VOD titles
        rtn = (broadcast.type === "VOD");
    }
    //non-HITBOX publishers
    var now = new Date();
    var staleTicks = 60000; // 1 minute = 1000 ticks * 60

    if (!rtn) {
        rtn = (utils.dateDiff(broadcast.last_heartbeat, now, utils.MILLIS) <= staleTicks);
    }

    return rtn;
}

BroadcastProvider.prototype.getRawCache = function() {
        return this.live_broadcast_cache;
    };

BroadcastProvider.prototype.get = function() {

        // clean up old ones here temporarily until this is moved to the db.
        this.cleanup_old_heartbeats();

        var data = this.vod_cache;
        //TODO: Uncomment when Mongo-ready
        //if (!data) {
        //    data = db_data_provider.get(this.title_name);
        //}
        if (data) {
            var combined = this.live_broadcast_cache.concat(data);
        } else {
            var combined = this.live_broadcast_cache;
        }

        // populate current viewer count - the ugly way, by counting the in-memory cache. should be from mongo.
        var viewer_count = 0;
        if (combined) {
            for (var i = 0; i < combined.length; i++) {
                var bcast_viewer_count = 0;
                var bcast_id = combined[i].id;
                if (player_ping_cache[bcast_id]) {
                    Object.keys(player_ping_cache[bcast_id]).forEach(function (session_id) {
                        if (player_ping_cache[bcast_id][session_id].active) {
                            bcast_viewer_count++;
                            viewer_count++;
                        }
                    });
                }
                combined[i].viewer_count = bcast_viewer_count;
            }
        }

        return {
            mdts: new Date(),
            title_id: this.title_name,
            viewer_count: viewer_count,
            broadcasts: combined
        }
    };

BroadcastProvider.prototype.createVOD = function(broadcast_data) {
    // need to assign a stream url/key
    if (this.title_name == broadcast_data.title_id) {
        // generate an id.
        if (!this.vod_cache) this.vod_cache = [];
        if (!(broadcast_data in this.vod_cache)) {
            this.vod_cache.push(broadcast_data);
        }
        return {result: "ok", messages: null};
    } else {
        return { result: "fail", messages: ["broadcast title id " + broadcast_data.title_id + " did not match provider title_name " + this.title_name]};
    }
}

BroadcastProvider.prototype.create = function(publisher_name, broadcast_data) {

        var broadcast = this.findBroadcast(publisher_name);
        if (broadcast) {
            console.log("Publisher already broadcasting");
            return {
                result: "fail",
                messages: ["There is already an existing broadcast for " + publisher_name + ". Call the delete API"]
            }
        }
        ;

        // create a new broadcast here
        // need to validate some minimum requirements

        // need to assign a stream url/key
        if (this.title_name == broadcast_data.title_id) {
            // generate an id.
            var bcast_id = this.title_name + "-" + publisher_name + "-" + new Date();

            var now = new Date();
            broadcast_data.id = md5(bcast_id);
            broadcast_data.publisher_name = publisher_name;
            broadcast_data.start_time = now;
            broadcast_data.last_heartbeat = now;

            this.live_broadcast_cache.push(broadcast_data);
            return {result: "ok", messages: null};
        } else {
            return { result: "fail", messages: ["broadcast title id " + broadcast_data.title_id + " did not match provider title_name " + this.title_name]};
        }
    };

BroadcastProvider.prototype.upsert = function(publisher_name, broadcast_data) {
        var broadcast = this.findBroadcast(publisher_name);
        if (broadcast) {
            broadcast.name= broadcast_data.name;
            broadcast.title_id= broadcast_data.title_id;
            broadcast.type= broadcast_data.type;
            broadcast.format= broadcast_data.format;
            broadcast.start_time= broadcast_data.start_time;
            broadcast.broadcast_uri= broadcast_data.broadcast_uri;
            broadcast.recorded_filename= broadcast_data.recorded_filename;
            broadcast.screenshots= broadcast_data.screenshots;
            broadcast.screenshot_filename= broadcast_data.screenshot_filename;
            broadcast.provider = broadcast_data.provider;
            broadcast.publisher_name= broadcast_data.publisher_name;
            broadcast.participants= broadcast_data.participants;
            broadcast.observers= broadcast_data.observers;
            broadcast.header = {
                cdts: broadcast.header.cdts,
                mdts: (broadcast_data.header.mdts) ? broadcast_data.header.mdts : broadcast_data.header.cdts,
                status: 'loading',
                object_type: 'Broadcast'
            };
            return {result: "ok", messages: null};
        } else {
            return this.create(publisher_name, broadcast_data);
        }
    };

BroadcastProvider.prototype.heartbeat = function (publisher_name, broadcast_data) {

        if (!broadcast_data) {
           console.log("missing broadcast_data for heartbeating " + publisher_name);
           return null;
        }

        var broadcast = this.findBroadcast(publisher_name);

        if (broadcast) {
            if (broadcast_data.name) {
                broadcast.name = broadcast_data.name;
            }
            if (broadcast_data.participants) {
                broadcast.participants = broadcast_data.participants;
            }
            if (broadcast_data.observers) {
                broadcast.observers = broadcast_data.observers;
            }
            broadcast.last_heartbeat = new Date();

        }

        return broadcast;
    };

BroadcastProvider.prototype.player_heartbeat = function (broadcast_id, session_id) {
        var obj = {
            type: "player_ping",
            broadcast_id: broadcast_id,
            session_id: session_id,
            dts: Date.now(),
            active: true
        };

        if (player_ping_cache[broadcast_id] == null) {
            player_ping_cache[broadcast_id] = {};
        }

        if (player_ping_cache[broadcast_id][session_id] == null) {
            player_ping_cache[broadcast_id][session_id] = obj;
        } else {
            player_ping_cache[broadcast_id][session_id].active = true;
            player_ping_cache[broadcast_id][session_id].dts = Date.now();
        }

        return true;
    };

BroadcastProvider.prototype.cleanup_old_heartbeats = function () {
        var now = Date.now();
        Object.keys(player_ping_cache).forEach(function (bcast_id) {
            var pings = player_ping_cache[bcast_id];
            Object.keys(pings).forEach(function (session_id) {
                var ping = pings[session_id];
                if (now - ping.dts > (30 * 1000)) {
                    ping.active = false;
                }
            });
        });
    };

BroadcastProvider.prototype.delete = function (publisher_name) {

        var bcast_index = indexOfPublisher(this.live_broadcast_cache, publisher_name);
        if (bcast_index >= 0) {
            var removed = this.live_broadcast_cache.splice(bcast_index, 1);
            var msgs = [];
            if (removed.length > 0) {
                for (var i = 0, len = removed.length; i < len; i++) {
                    msgs.push("Removed broadcast: " + removed[i].name + " (" + removed[i].id + ")");
                }
            } else {
                msg.push("Found a broadcast at index " + bcast_index + " but splice failed to return a removed object. strange");
            }
            return {result: "ok", messages: msgs};
        } else {
            return {result: "fail", message: ["No broadcasts found for publisher `" + publisher_name + "`"]};
        }
    };

BroadcastProvider.prototype.findBroadcast = function (publisher_name) {
        bcast_data = this.get();
        if (bcast_data && bcast_data.broadcasts) {
            for (var i = 0, len = bcast_data.broadcasts.length; i < len; i++) {
                if (bcast_data.broadcasts[i].publisher_name == publisher_name
                && bcast_data.broadcasts[i].title_id == this.title_name) {
                    var broadcast = bcast_data.broadcasts[i];
                    return broadcast;
                }
            }
        }

        return null;
    };


BroadcastProvider.prototype.broadcastOn = function (name, type) {

        // need to add broadcast type in here later.
        if (!(name in b_cache)) {
            b_cache[name] = 1;
        } else {
            b_cache[name]++;
        }

        return b_cache[name];
    };

BroadcastProvider.prototype.broadcastOff = function (name, data) {
        if (!(name in b_cache)) {
            b_cache[name] = 0;
        } else if (b_cache[name] > 0) {
            b_cache[name]--;
        }

        return b_cache[name];
    };

BroadcastProvider.prototype.name = function () {
        return this.title_name;
    };


BroadcastProvider.prototype.archive = function(callback) {
    //TODO: Mongo
    var bcast_data = this.live_broadcast_cache;
    if (bcast_data) {
        for (var i = 0, len = bcast_data.length; i < len; i++) {
            var bcast = bcast_data[i];
            //only delete hitbox broadcasts (for now)
            if (bcast && bcast.header == "hitbox") {
                if (bcast.header.status == "loading") {
                    bcast.header.status = "live";
                } else {
                    bcast_data.splice(i,1); //remove dead broadcasts
                }
            }
        }
        callback(null);
    } else {
        callback("No broadcasts in the cache");
    }

}

function indexOfPublisher(arr, publisher_name) {

    var len = arr.length;
    while (len--) {
        if (arr[len].publisher_name === publisher_name)
            return len;
    }

    return -1;
}


module.exports = BroadcastProvider;
module.exports.getInstance = function(id) {
    if (!id) return null;
    var cache_key = 'bcast_' + id;
    if (!(cache_key in instance_caches)) {
        instance_caches[cache_key] = new BroadcastProvider(id);
    }
    return instance_caches[cache_key];
};