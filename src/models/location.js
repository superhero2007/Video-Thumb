var mongoose     = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var Schema       = mongoose.Schema;

var locationSchema = new Schema({
    location_ID:                { type: String, required: true, unique: true },
    location_name:              { type: String, required: true },
    owner:                      { type: String, required: true },
    type:                       { type: String, required: true },
    format:                     { type: String, required: true },
    type:                       { type: String, required: true },
    age_rating:                         Number,
    languages:                        [ String ],
    link_texture:                       String,
        info:                       String,
    location_texture:                   String,
    location_texture_id:                String,
    location_texture_last_update:       String,
    use_video_ad_server:                Boolean,
    use_image_ad_server:                Boolean,
    ad_interval_minutes:                Number,
    screen:                           [ Number ],
    screen_r:                         [ Number ],
    loading_animation:                  Boolean,
    fastload: {
       "lq_360":       { type: String, required: true },
       "chq_360":      { type: String, required: true },
       "l_360":        { type: String, required: true },
       "r_360":        { type: String, required: true }
    },
    on_load_action: {
        action:      String,
        action_data: String
    },
    hotspots: [{
        name:        String,
        position:  [ Number ],
        action:      String,
        action_data: String,
        logic: {
          operation: String,
          condition: String,
          condition_true: {
              action:      String,
              action_data: String
          },
          condition_false: {
              action:      String,
              action_data: String
          }
        }
    }],
    dynamic_textures: [{
        name:       String,
        position: [ Number ],
         position_R: [ Number ],
        zone_ID:    String,
        assets: [{
            url: String,
            vid: String,
            date_start: String,
            date_end: String,
            geo: [ String ]
        }]
    }],
    dynamic_stats: {
        serveCount:  { type: Number, default: 0 },
        viewCount:   { type: Number, default: 0 }
    },
    header: {
        status:      { type: String, default: "new" },
        cdts:        { type: Date,   default: Date.now },
        mdts:        { type: Date,   default: Date.now },
        object_type: { type: String, default: "location" }
    }
});

// schema level indices
locationSchema.index({ location_ID: 1 });
locationSchema.index({ owner: 1 });
locationSchema.index({ "header.status": 1 });
locationSchema.index({ type: 1 });
locationSchema.index({ type: 1, "header.status": 1, link_texture: 1 });
locationSchema.plugin(findOrCreate);

if (!locationSchema.options.toObject) locationSchema.options.toObject = {};
locationSchema.set('toObject', { virtuals: false });
locationSchema.options.toObject.transform = function (doc, ret, options) {
  // remove the _id of every document before returning the result
  delete ret._id;
}

var Location = mongoose.model('Location', locationSchema);

module.exports = Location;
//module.exports = locationSchema;

