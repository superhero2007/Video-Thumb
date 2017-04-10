var utils = require('./utilities');
var mongoProvider = require('./medias_mongoprovider');
var md5 = require('md5');

function MediaProvider() {};

MediaProvider.prototype.useMongoProvider = function() {
    if (null == this.provider_impl) {
       console.log("MediaProvider setting provider implementation: MongoDB");
       this.provider_impl = mongoProvider.getInstance();
    }
};

MediaProvider.prototype.getById = function(id, include_deleted) {
    var promise = this.provider_impl.getById(id, include_deleted);
    return promise.then(function(media) {
        return media;
    });
};

MediaProvider.prototype.getByUser = function(user_id, include_deleted) {
     var promise = this.provider_impl.getByUser(user_id, include_deleted);
     return promise.then(function(medias) {
        var meds = (medias!=null) ? medias : [];
        return {
          'owner' : user_id,
          'media_count': meds.length,
          'medias': meds
        };
    });
}

MediaProvider.prototype.getAll = function(include_deleted) {
    var promise = this.provider_impl.get(include_deleted);
    return promise.then(function(medias) {
        var meds = (medias!=null) ? medias: [];
        return {
            'media_count': meds.length,
            'medias': meds
        };
    });
};

/* CRUD Logic */
MediaProvider.prototype.put = function(media) {
    var promise = this.provider_impl.put(media);
    return promise.then(function(document) {
        return document;
    });
}

MediaProvider.prototype.archive = function(media_id, requestor_id) {

    // todo: eventually put in some smarter  logic around who is allowed to do what.
    var req_id = (requestor_id == 'hplay_admin') ? null : requestor_id;
    return this.provider_impl.archive(media_id, req_id);
}

/* Dynamic Media API */
MediaProvider.prototype.serveDynamicMedia = function() {
    return this.provider_impl.serveDynamicMedia();
}

MediaProvider.prototype.MediaProvider = MediaProvider;

var Promise = require('bluebird');
var media_provider = module.exports = exports = Promise.promisifyAll(new MediaProvider());

