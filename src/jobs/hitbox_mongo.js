/**
 * Created by John on 2/19/2016.
 */
var HitboxBase = require("hitbox");
var hitboxSvc = hitboxSvc || require("../services/hitbox");
var mongoose = mongoose || require('mongoose');
var titleSchema = titleSchema || require("../models/title");
var broadcastSchema = broadcastSchema || require("../models/broadcast");
var hitbox_utils = hitbox_utils || require("./hitbox_utilities");

function HitboxMongo() {

};

HitboxMongo.prototype = new HitboxBase();
HitboxMongo.prototype.constructor = HitboxMongo;

/**
     * Titles can stick around.  Make sure to wipe out the hitbox counts
     * prior to processing the next set of live streams
     *
     * @param callback(err)
     */
    HitboxMongo.prototype.resetTitleCounts = function(callback) {
        //clear out all previous Hitbox titles??? Or just clear their counts??
        var Title = mongoose.model('Title', titleSchema);
        var bulk = Title.collection.initializeOrderedBulkOp();
        bulk.find({provider: "hitbox"})
            .update({$set: { cur_data: {
                count_2D: 0,
                count_3D: 0,
                count_VR: 0,
                bcast_count: 0
            }
            }});
        bulk.execute(function (error) {
            callback(error);
        });

    };

    /**
     * Broadcasts come and go.  "Archive" the old ones after updating/inserting the new ones
     *
     * @param callback(err)
     */
    HitboxMongo.prototype.archiveBroadcasts = function(callback) {
        //Broadcasts come and go... Titles can stick around
        var Broadcast = mongoose.model('Broadcast', broadcastSchema);
        var bulk = Broadcast.collection.initializeOrderedBulkOp();
        //Anything just loaded will have the status "loading".  Anything previously "live" should now be "archived"
        bulk.find({provider: "hitbox", "header.status": 'live' })
            .update({$set: { "header.status" : "archived"}});
        bulk.execute(function (error) {
            if (error) callback(error);
        });
        //We're done "loading", so make them "live"
        bulk.find({provider: "hitbox", "header.status": 'loading' })
            .update({$set: { "header.status" : "live"}});
        bulk.execute(function (error) {
            callback(error);
        });


    };

    /**
     * From the original Hitbox stream object, create (or update) the Title and
     * make sure the Broadcast exists
     *
     * @param stream         - JSON object brom hitbox
     * @param run_date       - timestamp to mark this run
     * @param callback(err)  - error handler for caller
     */
    HitboxMongo.prototype.createOrUpdateTitleAndBroadcast = function(stream, run_date, callback) {
        var Title = mongoose.model('Title', titleSchema);
        var Broadcast = mongoose.model('Broadcast', broadcastSchema);
        var self = this;
        //a) Populate the Title object as:
        Title.findOrCreate({id: stream.category_id}, {
            title: stream.category_name,
            reverse_ad: null,
            desc: null,
            cover_art: [
                "http://edge.sf.hitbox.tv" + stream.category_logo_large
            ],
            cover_art_filename: null,
            title_url: null,
            type: "game",
            support: ["2D"],
            last_update: hitbox_utils.convertHitboxDateTimeToHashplayDateTime(stream.category_updated),
            provider: "hitbox",
            cur_data: {
                count_2D: 1,
                count_3D: 0,
                count_VR: 0,
                bcast_count: 1
            },
            header: {
                cdts: run_date,
                mdts: null,
                status: 'loading',
                object_type: 'Title'
            }

        }, function (err, title, created) {
            if (err) {
                console.log("Unable to find and update Title " + stream.category_name + ":" + err.message)
                callback(err);
            }
            if (!err && created) {
                console.log("New Title " + stream.category_name + " CREATED!");
            }
            if (!err && !created) {
                title.title = stream.category_name;
                title.cover_art = [
                    "http://edge.sf.hitbox.tv" + stream.category_logo_large
                ];
                title.last_update = hitbox_utils.convertHitboxDateTimeToHashplayDateTime(stream.category_updated),
                title.cur_data.count_2D++;
                title.cur_data.bcast_count++;
                title.header = {
                    cdts: title.header.cdts,
                    mdts: run_date,
                    status: 'loading',
                    object_type: 'Title'
                }
                title.save(function (err) {
                    if (err) {
                        console.log("Unable to save Title " + stream.category_name + ":" + err.message);
                        callback(err);
                    }
                });
            }
            if (!err) {
                //b) Query for the URL using http://api.hitbox.tv/player/config/live/:media_name to build the Broadcast URL
                hitboxSvc.mediaUser(stream.media_name, function (err, res, data) {
                    if (err) {
                        console.log("Unable to find  Broadcast at Hitbox! : " + stream.media_name + ":" + err.message)
                        callback(err);
                    }
                    if (data) {
                        var clip = data.clip;
                        var bcastUrl = hitbox_utils.cleanupURL(clip.url, clip.bitrates);

                        Broadcast.findOrCreate({id: stream.media_id}, {
                            name: stream.media_display_name,
                            title_id: stream.category_id,
                            type: clip.type,
                            format: "2D",
                            start_time: stream.media_live_since,
                            broadcast_uri: bcastUrl,
                            recorded_filename: null,
                            screenshots: null,
                            screenshot_filename: null,
                            provider: "hitbox",
                            publisher_name: "HITBOX:" + stream.media_user_name,
                            participants: null,
                            observers: null,
                            header: {
                                cdts: run_date,
                                status: 'loading',
                                object_type: 'Broadcast'
                            }

                        }, function (err, broad, created) {
                            if (err) {
                                console.log("Unable to find and update Title " + stream.media_id + ":" + err.message)
                                callback(err);
                            }
                            if (!err && created) {
                                console.log("Broadcast for " + stream.media_id + " CREATED!");
                            }
                            if (!err && !created) {
                                broad.name = stream.media_display_name;
                                broad.title_id = stream.category_id;
                                broad.type = clip.type;
                                broad.format = "2D";
                                broad.start_time = stream.media_live_since;
                                //TODO:  Do I get this from a CDN? How do I know which one?
                                broad.broadcast_uri = bcastUrl;
                                broad.recorded_filename = null;
                                broad.screenshots = null;
                                broad.screenshot_filename = null;
                                broad.provider = "hitbox";
                                broad.publisher_name = "HITBOX:" + stream.media_user_name;
                                broad.participants = null;
                                broad.observers = null;
                                broad.header = {
                                    cdts: broad.header.cdts,
                                    mdts: run_date,
                                    status: 'loading',
                                    object_type: 'Broadcast'
                                }
                                broad.save(function (err) {
                                    if (err) {
                                        console.log("Unable to save Broadcast " + stream.media_display_name + ":" + err.message);
                                        callback(err);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
        callback(null);
    };

HitboxMongo.prototype.execute = function(callback) {
    HitboxBase.prototype.execute(this, callback);
}


module.exports = new HitboxMongo();