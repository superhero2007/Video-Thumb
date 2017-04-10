/**
 * Created by John on 2/19/2016.
 */
var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');

var Schema = mongoose.Schema;
/**
 * {
  "id": hitbox.live.category_id,
  "title": hitbox.live.category_name,
  "reverse_ad": ???,
  "desc": ???,
  "cover_art": [
    "http://edge.sf.hitbox.tv" + hitbox.live.category_logo_large
  ],
  "cover_art_filename": null,
  "title_url": ???,
  "type": "game",
  "support": ["2D"],
  "last_update": hitbox.live.category_updated,
  "game": {},
  "provider":"hitbox",
  "cur_data": {
    "count_2D": hitbox.live.category_viewers,
    "count_3D": 0,
    "count_VR": 0,
    "bcast_count": <count of all live streams of this category>
  }
}

 * @type {mongoose.Schema}
 */

var titleSchema = new Schema({
    id: String,
    title:  String,
    reverse_ad: String,
    desc:   String,
    cover_art: [ String ],
    title_url:  String,
    type:  String,
    support:  [ String ],
    last_update: { type: Date, default: null },
    provider: String,
    cur_data: {
        count_2D: Number,
        count_3D:  Number,
        count_VR:  Number,
        bcast_count:  Number
    },
    header: {
        status: String,
        cdts: {type: Date, default: null},
        mdts: {type: Date, default: null},
        object_type: String
    }
});

titleSchema.index({ id: 1 }); // schema level
titleSchema.index({ provider: 1 }); // schema level
titleSchema.plugin(findOrCreate);

module.exports = titleSchema;

