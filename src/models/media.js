var mongoose     = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var Schema       = mongoose.Schema;

var mediaSchema = new Schema({
    media_id:          { type: String, required: true, unique: true },
    name:              { type: String, required: true },
    original_filename: { type: String, required: false },
    stored_filename:   { type: String, required: true },
    owner:             { type: String, required: true },
    mime_type:         { type: String, required: true },
    size:              { type: Number, required: true },
    asset_type:        { type: String, required: true },
    bucket_name:       { type: String, required: false },
    thumbnail_id:      { type: String, required: false },
    submission_ip:     { type: String, required: false },
    status:            { type: String, required: true, default: "pending" },
    fastload: {
        full_lores_id: { type: String },
        middle_id: { type: String },
        left_id: { type: String },
        right_id: { type: String}
    }
}, {
    timestamps: {
        createdAt: 'cdts',
        updatedAt: 'mdts'
    }
});


// schema level indices
mediaSchema.index({ media_id: 1 });
mediaSchema.index({ owner: 1 });
mediaSchema.plugin(findOrCreate);

if (!mediaSchema.options.toObject) mediaSchema.options.toObject = {};
mediaSchema.set('toObject', { virtuals: false });
mediaSchema.options.toObject.transform = function (doc, ret, options) {
  // remove the _id of every document before returning the result
  delete ret._id;
}

var Media = mongoose.model('Media', mediaSchema);

module.exports = Media;
