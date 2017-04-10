function MediaMongoProvider() {
    this.Media = require('./models/media');
    this.deleted_filter = { "status": { "$ne": "archived" }}
};

MediaMongoProvider.prototype.get = function(include_deleted) {
        var filter  = {};
        var fields  = { _id: 0, __v: 0 };
        var sort_by = { media_id: -1 };
        if (!this.includeDeleted(include_deleted)) {
            Object.assign(filter, this.deleted_filter);
        }

        return this.Media.find(filter, fields).sort(sort_by).exec().then(function(medias) {
            return medias;
        });
    };

MediaMongoProvider.prototype.getById = function(id, include_deleted) {
        var filter  = { media_id: id };
        var fields  = { _id: 0, __v: 0 };
        var sort_by = { media_id: -1 };
        if (!this.includeDeleted(include_deleted)) {
            Object.assign(filter, this.deleted_filter);
        }

        return this.Media.find(filter, fields).sort(sort_by).exec().then(function(medias) {
            if (medias && medias.length > 1) {
                throw new Error("Found two records when there should only have been one for media_id: " + id);
            }
            return medias[0];
        });
    };

MediaMongoProvider.prototype.getByUser = function(user_id, include_deleted) {
        var filter  = { owner: user_id };
        var fields  = { _id: 0, __v: 0 };
        var sort_by = { media_id: -1 };
        if (!this.includeDeleted(include_deleted)) {
            Object.assign(filter, this.deleted_filter);
        }

        return this.Media.find(filter, fields).sort(sort_by).exec().then(function(medias) {
            return medias;
        });
    };

MediaMongoProvider.prototype.put = function(media) {
        return this.Media.findOneAndUpdate(
            { media_id : media.media_id, owner: media.owner },
            media,
            { upsert: true, setDefaultsOnInsert: true, new: true }
          ).exec().then(function(media) {
            return media;
        });
    };

MediaMongoProvider.prototype.archive = function(id, user_id) {

        var search = { media_id : id };

        if (user_id) {
            Object.assign(search, { owner: user_id });
        }

        return this.getById(id, false)
            .then(function(media) {
                console.log("Archiving: " + media.media_id);
                var Media = require('./models/media');
                Media.update(
                    search,
                    { status: "archived" }
                    ).exec().then(function(media) {
                        return media;
                    });
                return media;
            });
    };

MediaMongoProvider.prototype.delete = function(media_id, user_id) {
        var query = null
        if (user_id) {
            query = { media_id: media_id, owner: user_id }
        } else  {
            query = { media_id: media_id }
        }

        return this.Media.findOneAndRemove(query).exec().then(function(media) {
              return media;
        });
    };

MediaMongoProvider.prototype.serveDynamicMedia = function() {

        var filter  = { $and:[{ type: "dynamic" },
                             { "header.status": "published" },
                             { link_texture: { $exists: true }},
                             { link_texture: { $ne: null }}
                      ]};
        var fields  = { media_id: 1, link_texture: 1, _id: 0};
        var sort_by = { "dynamic_stats.serveCount": 1 };

        return this.Media.findOne(filter, fields).sort(sort_by).exec().then(function(media) {
            return media;
        }).then(function(media) {
            if (media) {
                var MediaModel = require('./models/media');
                MediaModel.update({media_id: media.media_id},{ $inc : { "dynamic_stats.serveCount": 1}}).exec();
            } else {
                console.log("Couldn't increment serveCount because served media was null");
            }
            return media;
        });
    };

MediaMongoProvider.prototype.includeDeleted = function(include_deleted) {
        if (typeof include_deleted === 'boolean' && include_deleted) { return true; }
        if (typeof include_deleted === 'string' && include_deleted.toLowerCase() == 'true' ) { return true; }
        return false;
    };

MediaMongoProvider.prototype.MediaMongoProvider = MediaMongoProvider;

module.exports = exports = MediaMongoProvider;
var media_mongo_provider = null;

module.exports.getInstance = function() {
    if (null == media_mongo_provider) {
        media_mongo_provider = new MediaMongoProvider;
    }
    return media_mongo_provider;
}
