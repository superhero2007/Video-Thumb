/**
 * Created by John on 2/19/2016.
 */
var mongoose = mongoose || require('mongoose');
var titleSchema = titleSchema || require("../models/title");
var broadcastSchema = broadcastSchema || require("../models/broadcast");

module.exports = function () {
    var Broadcast = mongoose.model('Broadcast', broadcastSchema);

    this.get = function(title_id) {

        Broadcast.find({ 'title_id': title_id }, function (err, broadcasts) {
            if (broadcasts) return broadcasts;
            return err;
        })

    }

    //TODO:a
    //this.create
}