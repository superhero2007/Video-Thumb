function LocationMongoProvider() {
    this.Location = require('./models/location');
    this.deleted_filter = { "header.status": { "$ne": "deleted" }}
};                   

LocationMongoProvider.prototype.getWithFilter = function(filter_by, include_deleted) {
        var filter  = (filter_by) ? filter_by : {};
        var fields  = { _id: 0, __v: 0 };
        var sort_by = { location_ID: 1 };

        if (!this.includeDeleted(include_deleted) && filter['header.status']) {
           Object.assign(filter, this.deleted_filter);
        }

        return this.Location.find(filter_by, fields).sort(sort_by).exec().then(function(locations) {
            return locations;
        });
    };

LocationMongoProvider.prototype.getLocationsInList = function(list_ids, include_deleted) {
    return this.getWithFilter({ location_ID: { "$in": list_ids }}, include_deleted)
        .then(function(locations) {
            return locations;
        });
};

LocationMongoProvider.prototype.getById = function(id, include_deleted) {
        var filter  = { location_ID: id };
        var fields  = { _id: 0, __v: 0 };
        var sort_by = { location_ID: 1 };
        if (!this.includeDeleted(include_deleted)) {
            Object.assign(filter, this.deleted_filter);
        }

        return this.Location.find(filter, fields).sort(sort_by).exec().then(function(locations) {
            if (locations && locations.length > 1) {
                throw new Error("Found two records when there should only have been one for location_id: " + id);
            }
            return locations[0];
        });
    };

LocationMongoProvider.prototype.getByUser = function(user_id, include_deleted) {
        var filter  = { owner: user_id };
        var fields  = { _id: 0, __v: 0 };
        var sort_by = { location_ID: 1 };
        if (!this.includeDeleted(include_deleted)) {
            Object.assign(filter, this.deleted_filter);
        }

        return this.Location.find(filter, fields).sort(sort_by).exec().then(function(locations) {
            return locations;
        });
    };

LocationMongoProvider.prototype.put = function(location) {
        return this.Location.findOneAndUpdate(
            { location_ID : location.location_ID, owner: location.owner },
            location,
            { upsert: true, setDefaultsOnInsert: true, new: true }
          ).exec().then(function(location) {
            return location;
        });
    };

LocationMongoProvider.prototype.delete = function(location_id, user_id) {
        var query = null
        if (user_id) {
            query = { location_ID: location_id, owner: user_id }
        } else  {
            query = { location_ID: location_id }
        }

        return this.Location.findOneAndRemove(query).exec().then(function(location) {
              return location;
        });
    };

LocationMongoProvider.prototype.serveLRUDynamicLocation = function(language_filter) {
    var filter  = { $and:[{ type: "dynamic" },
                             { "header.status": "published" },
                             { link_texture: { $exists: true }},
                             { link_texture: { $ne: null }}
                      ]};
    const fields  = { location_ID: 1, link_texture: 1, _id: 0};                    
    addLanguageToFilter(filter, language_filter);
    var sort_by = { "dynamic_stats.serveCount": 1 };
    return this.Location.findOne(filter, fields).sort(sort_by).exec().then(function(dynLoc) {
                if (dynLoc) {
                    var foundDynLocation = dynLoc;
                    if (foundDynLocation.length) var foundDynLocation = dynLoc[0];
                    incrementServeCountForLocation(foundDynLocation);
                } else {
                    console.log("Couldn't increment serveCount because served location was null");
                }
                return foundDynLocation;
            });

};

LocationMongoProvider.prototype.serveRandomDynamicLocation = function(language_filter) {
    var filter  = { $and:[{ type: "dynamic" },
                             { "header.status": "published" },
                             { link_texture: { $exists: true }},
                             { link_texture: { $ne: null }}
                      ]};
    const fields  = { location_ID: 1, link_texture: 1, _id: 0};  
    addLanguageToFilter(filter, language_filter);
    return this.Location.aggregate(
                    {
                        "$match" : filter
                    },
                    {
                        "$sample" : {size : 1}
                    },
                    {
                        "$project": fields
                    }).exec().then(function(dynLoc) {
                if (dynLoc) {
                    var foundDynLocation = dynLoc;
                    if (foundDynLocation.length) var foundDynLocation = dynLoc[0];
                    incrementServeCountForLocation(foundDynLocation);
                } else {
                    console.log("Couldn't increment serveCount because served location was null");
                }
                return foundDynLocation;
            });

};

function incrementServeCountForLocation(dynamicLocation) {
    var LocationModel = require('./models/location');
    LocationModel.update({location_ID: dynamicLocation.location_ID},{ $inc : { "dynamic_stats.serveCount": 1}}).exec();
}

function addLanguageToFilter(filter, language_filter) {
    if (language_filter) {
            filter['$and'].push( { languages: { $in: [ language_filter ]}});
        }
}

LocationMongoProvider.prototype.includeDeleted = function(include_deleted) {
        if (typeof include_deleted === 'boolean' && include_deleted) { return true; }
        if (typeof include_deleted === 'string' && include_deleted.toLowerCase() == 'true' ) { return true; }
        return false;
    };

LocationMongoProvider.prototype.LocationMongoProvider = LocationMongoProvider;

module.exports = exports = LocationMongoProvider;
var location_mongo_provider = null;

module.exports.getInstance = function() {
    if (null == location_mongo_provider) {
        location_mongo_provider = new LocationMongoProvider;;
    }
    return location_mongo_provider;
}
