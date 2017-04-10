var utils = require('./utilities');
var dirLoader = require('./locations_dirloader')
var mongoProvider = require('./locations_mongoprovider');
var heartbeatProvider = require('./locationheartbeats_mongoprovider');
var media_provider = media_provider || require('./media_provider');
var VersionProvider = require('./version_provider');
var version_provider = new VersionProvider();
var stream_handler = stream_handler || require('./stream_handler');

const util = require('util');
const OBJECT_TYPE = "server.location.serve";

var Header = {
    client_ver: "0",
    version: "",
    platform: utils.PLATFORM,
    created_by: "",
    object_type: OBJECT_TYPE,
    cdts: ""
}; 

var LocationEvent = { 
    request_location_id: "",
    request_language: "",
    served_location_id: "",
    serve_type: "",
    header : Object.create(Header)
};

function LocationProvider() {};

LocationProvider.prototype.useDirProvider = function(dir) {
    if (null == this.provider_impl) {
       console.log("LocationProvider setting provider implementation: DirProvider(" + dir + ")");
       this.provider_impl = dirLoader.getInstance(dir);
    }
};

LocationProvider.prototype.useMongoProvider = function() {
    if (null == this.provider_impl) {
       console.log("LocationProvider setting provider implementation: MongoDB");
       this.provider_impl = mongoProvider.getInstance();
    }
};

LocationProvider.prototype.getById = function(id, include_deleted) {
    return this.provider_impl.getById(id, include_deleted)
        .then(this.resolveHashplayMedia);
};

LocationProvider.prototype.getByUser = function(user_id, include_deleted) {
    var promise = this.provider_impl.getByUser(user_id, include_deleted);
    return Promise.join(promise.map(this.resolveHashplayMedia),
        function(locations) {
            var locs = (locations!=null) ? locations : [];
            return {
                'owner' : user_id,
                'location_count': locs.length,
                'locations': locs
            };
        });
}

LocationProvider.prototype.getAll = function(include_deleted, user_filter) {
    var promise = this.provider_impl.getWithFilter(user_filter, include_deleted );
    return Promise.join(promise.map(this.resolveHashplayMedia),
        function(locations) {
            var locs = (locations!=null) ? locations: [];
            return {
                'location_count': locs.length,
                'locations': locs
            };
        });
};

/* CRUD Logic */
LocationProvider.prototype.put = function(location) {

    // TODO: Add validation callbacks here using promises and chaining
    return this.provider_impl.put(location);
};

LocationProvider.prototype.delete = function(location_id, requestor_id) {
    var promise = null;

    // TODO: eventually put in some smarter logic around who is allowed to do what.
    if (requestor_id == 'hplay_admin') {
        promise = this.provider_impl.delete(location_id);
    } else {
        promise = this.provider_impl.delete(location_id, requestor_id);
    }

    return promise;
};

LocationProvider.prototype.resolveHashplayMedia = function(location) {

    return populateLocationTextures(location);
};

function populateLocationTextures(location) {

    if (!location) { return Promise.resolve(null); }

    if (!location.location_texture_id || location.location_texture_id == '') {
        return Promise.resolve(location);
    }

    console.log("LocationProvider|populateLocationTextures|Loading location textures for " + location.location_ID + " configured for texture ID: " + location.location_texture_id);
    return location_texture_promise = media_provider.getById(location.location_texture_id, false)
        .then(function(media_data) {

            if (location.location_texture_id) {
                location.location_texture = resolveMediaUrl(media_data);
            }

            // the passing of an object here is kind of hacky.  We don't store fastload objects as their own
            // media objects, but the resolveMediaUrl is expecting the media_data object, so we're  faking it
            // and it only works in S3 mode

            // The media_data.fastload fields are defined in the models/media.js object
            if (media_data && media_data.fastload) {
                location.fastload.lq_360 = resolveMediaUrl({ stored_filename: media_data.fastload.full_lores_id });
                location.fastload.chq_360 = resolveMediaUrl({ stored_filename: media_data.fastload.middle_id });
                location.fastload.l_360 = resolveMediaUrl({ stored_filename: media_data.fastload.left_id });
                location.fastload.r_360 = resolveMediaUrl({ stored_filename: media_data.fastload.right_id  });
            }
            return location;
        });
};

// TODO: This really belongs in a utility function that is shared with routes/media.js
//        for the time being, this is duplicated code, and that is bad
//        not completely duplicated, but very similar.
function resolveMediaUrl(media) {

    if (!media) {
        console.log("LocationProvider|resolveMediaUrl|media was null, nothing to resolve");
        return null;
    }

    if (media.status && !(media.status == "active" || media.status == "deleted")) {
        console.log("LocationProvider|resolveMediaUrl|media has no status, or is not active/deleted. Object:" + util.inspect(media, false, null));
        return null;
    }

    if ("S3" == process.env.MEDIA_DIR_MODE) {
        if (!media.stored_filename || media.stored_filename == '') {
            console.log("LocationProvider|resolveMediaUrl|media object missing valid stored_filename (S3 MODE). Object:" + util.inspect(media, false, null));
            return null;
        }

        return process.env.AWS_CLOUDFRONT_URL + '/' + media.stored_filename;
    }

    if (!media.media_id || media.media_id == '') {
        console.log("LocationProvider|resolveMediaUrl|media object missing valid media_id (LOCAL MODE). Object:" + util.inspect(media, false, null));
        return null;
    }

    var media_host = (process.env.LOCAL_MEDIA_HOST) ? process.env.LOCAL_MEDIA_HOST : "http://capi-dev.hashplay.net";
    return media_host + '/med/v1/render/' + media.media_id;
};

LocationProvider.prototype.getLocationTree = function(id, include_deleted, parent_id, cache) {

    var locationCache = (cache) ? cache : {};
    var scope = {
        provider: this,
        cache: locationCache,
        current_node: { name: "Unknown", id: null, parent: null, children: [] },
        parent_id: parent_id,
        current_id: id,
        child_ids: null
    };

    return this.provider_impl.getById(id, false)
        .then(function(location) {
            // if this has been seen, then exit, children have already been processed
            if (!location) {
                return [];
            }
            scope.current_node.name     = location.location_name;
            scope.current_node.loc_id   = location.location_ID;
            scope.current_node.status   = location.header.status;
            scope.current_node.parent   = parent_id;

            if (scope.cache[location.location_ID]) {
                scope.current_node.loc_id = location.location_ID + " [cycle]";
                return [];
            }

            scope.cache[location.location_ID] = true;
            scope.parent_id = location.location_ID;

            // make this location the parent and look up its children.
            scope.child_ids = scope.provider.getChildren(location);
            return scope.provider.provider_impl.getLocationsInList(scope.child_ids, include_deleted);

        }).mapSeries(function(location) {

            // if there is no node, just return
            if (!location) { console.log("mapper item was null"); return null; }
            var current_node = scope.current_node;

            // now we need to add this child, by recursing down.
            var promise = scope.provider.getLocationTree(location.location_ID, include_deleted, scope.parent_id, scope.cache);
            scope.current_node = current_node;
            return promise;
       }).then(function(node) {
            if (node && node.length > 0) {
                scope.current_node.children = node;
            }
        }).then(function() {

            // deal with all the dead children
            if (scope.child_ids) {
                scope.child_ids.filter(function(child_id) {
                    return !(scope.cache.hasOwnProperty(child_id));
                }).forEach(function(child_id) {
                    scope.current_node.children.push({
                        name: "Missing Data",
                        loc_id: child_id + " (not found in location storage)",
                        parent: scope.current_id,
                        status: "unknown",
                        children: []
                    });
                });
            }
             scope.child_ids = null;

            return scope.current_node;
        }).bind(scope);
};

LocationProvider.prototype.getChildren = function(location) {
    var jsonQuery = require('json-query');
    var children = jsonQuery("hotspots[*action=LOC].action_data", { data: location });
    return children.value;
};

LocationProvider.prototype.serveDynamicLocation = function(loc_id, language_filter) {
    var random_int = Math.floor((Math.random() * 10) + 1);
    var dynLocationPromise = null;
    var lprovider = this;
    var typeString;
    if (random_int < 4) {
        typeString = "lru";
        dynLocationPromise = this.provider_impl.serveLRUDynamicLocation(language_filter);
    } else {
        typeString = "random";
        dynLocationPromise = this.provider_impl.serveRandomDynamicLocation(language_filter);
    }
    return dynLocationPromise.then(function(location) {
        if (loc_id) { lprovider.postDynamicLocationFoundEvent(typeString, location, loc_id, language_filter); }
        return location;
    });
};

LocationProvider.prototype.heartbeat = function(location_id, user_id, display_name) {

    return heartbeatProvider.getInstance().put(location_id, user_id, display_name);
};

LocationProvider.prototype.getVisitorCount = function(location_id) {

    return heartbeatProvider.getInstance().countByLocation(location_id);
};

LocationProvider.prototype.postDynamicLocationFoundEvent = function(typeFound, served_location, requested_location, language) {
    var event = Object.create(LocationEvent);
    event.request_location_id = requested_location;
    event.request_language = language;
    event.served_location_id = served_location.location_ID;
    event.serve_type = typeFound;
    event.header.cdts = Date.now();
    event.header.version = version_provider.getVersion();
    stream_handler.process(utils.NAME_STRING, event);
};

LocationProvider.prototype.LocationProvider = LocationProvider;

var Promise = require('bluebird');
var location_provider = module.exports = exports = Promise.promisifyAll(new LocationProvider());

