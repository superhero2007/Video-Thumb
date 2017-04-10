/**
 * Created by John on 2/19/2016.
 */
var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');

var Schema = mongoose.Schema;
/**
 BROADCAST Object

 {
   "id": hitbox.live.media_id,
   "name": hitbox.live.media_display_name,
   "title_id": hitbox.live.category_id,
   "type": hitbox.config.clip.type,
   "format": hitbox.config.???, This is always 2D for Hitbox
   "start_time": hitbox.live.media_live_since,
   "broadcast_uri": hitbox.config.???, This is the HLS playback URL of that live stream, e.g.  "url": "http:\/\/api.hitbox.tv\/player\/hls\/cracowgamespot.m3u8
   "recorded_filename": hitbox.config.???,   ignore, only used with VOD content.
   "screenshots": [
     <base url for hitbox????> + hitbox.config.clip.url – Not sure  - you do not need a base URL. The video URL is all we require to play.
   ],
   "screenshot_filename": null,
   "provider":"hitbox",
   "publisher_name": hitbox.config.clip.provider???,  hitbox.live "user_name": "ECTVLoL" – put “HITBOX”: in front of that name please
   "participants": [
     ???
   ],
   "observers": [ ???   see above  hitbox.live.category_viewers
   ]
 }
 */

var broadcastSchema = new Schema({
    id: String,
    name:  String,
    title_id:  String,
    type:  String,
    format: String,
    start_time: { type: Date, default: null },
    broadcast_uri:   String,
    recorded_filename:  String,
    screenshots: [ String ],
    screenshot_filename:   String ,
    publisher_name:   String ,
    provider: String,
    participants: [ String ],
    observers: [ String ],
    header: {
        status: String,
        cdts: {type: Date, default: null},
        mdts: {type: Date, default: null},
        object_type: String
    }
});

broadcastSchema.index({ id: 1 }); // schema level
broadcastSchema.index({ title_id: 1 }); // schema level
broadcastSchema.index({ provider: 1 }); // schema level
broadcastSchema.plugin(findOrCreate);

module.exports = broadcastSchema;
