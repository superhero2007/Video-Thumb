'use strict';
function TitleProvider() {
    this.t_cache = {};
    this.loader_impl = require('./titles_dirloader')('data/titles', this.t_cache); //inits the cache
    var TitleDirProvider = require("./titles_dirprovider");
    this.provider_impl = new TitleDirProvider(this.t_cache);
    //TODO: Uncomment all db_provider lines below when Mongo-ready
    //var dbPvdr = require('./titles_mongoprovider');
    //this.db_provider_impl = new dbPvdr();
};

TitleProvider.prototype.find = function(title_id) {
    var obj = this.provider_impl.getTitle(title_id);
    //if (!obj) {
    //    obj = this.db_provider_impl.getTitle(title_id);
    //}
    return obj;
};

TitleProvider.prototype.findAll = function() {
    var objs = this.provider_impl.get();
    //var dbObjs = this.db_provider_impl.get();
    //if (dbObjs && Array.isArray(dbObjs)) {
    //    if (!objs) {
    //        objs = [];
    //    }
    //    for (var t=0; t < dbObjs.length; t++) {
    //        objs.push(dbObjs[t]);
    //    }
    //}
    return objs;
};

TitleProvider.prototype.getTitle = function(title_id) {
    return this.find(title_id);
};

TitleProvider.prototype.get = function() {
    return this.findAll();
};

TitleProvider.prototype.create = function(title_id, title_data) {
    //TODO:Mongo
    return this.provider_impl.add(title_id, title_data);
};

TitleProvider.prototype.update = function(title_id, title_data) {
    //TODO:Mongo
    return this.provider_impl.setTitle(title_id, title_data);
};

TitleProvider.prototype.updateCurData = function(title_id, cur_data) {
    //TODO:Mongo
    return this.provider_impl.updateCurData(title_id, cur_data);
};

TitleProvider.prototype.incrementCurData = function(title_id, cur_data) {
    //TODO:Mongo
    return this.provider_impl.incrementCurData(title_id, cur_data);
};

TitleProvider.prototype.upsert = function(title, callback) {
    //TODO: Mongo
    return this.provider_impl.upsert(title, callback);
}

TitleProvider.prototype.TitleProvider = TitleProvider;

var title_provider = module.exports = exports = new TitleProvider();

