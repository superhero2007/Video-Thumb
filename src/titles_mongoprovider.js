/**
 * Created by John on 2/19/2016.
 */
var mongoose = require('mongoose');
var titleSchema = titleSchema || require("../models/title");

module.exports = function () {
    var Title = mongoose.model('Title', titleSchema);

    this.getTitle = function(title_id) {

        Title.findOne({ 'id': title_id }, function (err, title) {
            if (title) return title;
            return null;
        })

    };

    this.get = function() {
        Title.find({}, function(err, titles){
            if (titles) return titles;
            return err;
        });
    };

}