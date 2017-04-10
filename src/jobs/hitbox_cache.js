/**
 * Created by John on 2/23/2016.
 */
var HitboxBase = HitboxBase || require("./hitbox");
var hitboxSvc = hitboxSvc || require("../services/hitbox");
var BroadcastProvider = BroadcastProvider || require("../broadcast_provider");
var title_provider = title_provider || require('../title_provider');
var utils = require('../utilities');
var hitbox_utils = require('./hitbox_utilities');

function HitboxCache() {
    this.caches = {};
};

HitboxCache.prototype = new HitboxBase();
HitboxCache.prototype.constructor = HitboxCache;

HitboxCache.prototype.resetTitleCounts = function(callback) {
    //clear out all previous Hitbox titles??? Or just clear their counts??
    var cur_data = {
        count_2D: 0,
        count_3D: 0,
        count_VR: 0,
        bcast_count: 0
    };
    var titles = title_provider.findAll();
    if (titles) {
        var keys = Object.keys(titles);
        for (var t = 0; t < keys.length; t++) {
            var title = titles[keys[t]];
            if (title.provider == "hitbox") {
                title_provider.updateCurData(title.id, cur_data);
            }
        }
    } else {
        callback("No titles in the cache");
    }

};
/**
 * All broadcasts that are expired should be removed from the cache
 *
 * @param callback(err)
 */
HitboxCache.prototype.archiveBroadcasts = function(callback) {
    var titles = title_provider.findAll();
    if (titles) {
        var keys = Object.keys(titles);
        for (var t = 0; t < keys.length; t++) {
            var provider = this.getBroadcastProvider(titles[keys[t]].id);
            provider.archive(callback);
        }
    }
};
//just copying cms for now
HitboxCache.prototype.getBroadcastProvider = function(id) {

    if (!id) return null;
    return BroadcastProvider.getInstance(id);
};


/**
 * From the original Hitbox stream object, create (or update) the Title and
 * make sure the Broadcast exists
 *
 * @param stream         - JSON object from hitbox
 * @param run_date       - timestamp to mark this run
 * @param callback(err)  - error handler for caller
 */
HitboxCache.prototype.createOrUpdateTitleAndBroadcast = function(stream, run_date, callback) {
    if (stream.category_id) {
        var title = {
            id: stream.category_id,
            title: stream.category_name,
            reverse_ad: '',
            desc: '',
            cover_art: [
                "http://edge.sf.hitbox.tv" + stream.category_logo_large
            ],
            cover_art_filename: '',
            title_url: '',
            type: 'game',
            support: ['2D'],
            last_update: hitbox_utils.convertHitboxDateTimeToHashplayDateTime(stream.category_updated),
            provider: 'hitbox',
            game: {},
            cur_data: {
                count_2D: 1,
                count_3D: 0,
                count_VR: 0,
                bcast_count: 1
            },
            header: {
                cdts: run_date,
                mdts: run_date,
                status: 'loading',
                object_type: 'Title'
            }
        };

        title_provider.upsert(title, callback);
        var self = this;
        hitboxSvc.mediaUser(stream.media_name, function (err, res, data) {
            if (err) {
                console.log("Unable to find  Broadcast at Hitbox! : " + stream.media_name + ":" + err.message)
                callback(err);
            }
            if (data) {
                var clip = data.clip;
                if (clip) {
                    var publisher = "HITBOX:" + stream.media_user_name;
                    var broadcast = hitbox_utils.convertHitboxToHashplayBroadcast(clip, stream, publisher);
                    var bpvdr = self.getBroadcastProvider(stream.category_id);
                    if (!bpvdr) {
                        console.log("Could not get broadcast provider for title: " + stream.category_id);
                    } else {
                        var result = bpvdr.upsert(publisher, broadcast);
                    }
                }

            }
        });

        callback(null);
    } else {
        callback("No Title! for publisher " + stream.media_user_name);
    }

};

HitboxCache.prototype.execute = function(callback) {
    HitboxBase.prototype.execute(this, callback);
}

module.exports = new HitboxCache();