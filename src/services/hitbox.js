/**
 * Created by John on 2/19/2016.
 */
var request = require("request")

var API = {
    media: function(callback, limit){
        if (!limit) limit = 100;
        request({
            url: "https://api.hitbox.tv/media/live/list.json?limit=" + limit,json: true
        }, function (err, res, data) {
            callback(err, res, data);
        });
    },

    mediaUser: function(username, callback){
        request({
            url: "http://api.hitbox.tv/player/config/live/" + username + ".json?showHidden=true",json: true
        }, function (err, res, data) {
            callback(err, res, data);
        });
    },

    //mediaFollowing: function(username, callback) {
    //    request({
    //        url: "http://api.hitbox.tv/media/live/" + username + ".json?showHidden=true",json: true
    //    }, function(err, res, data) {
    //        if (err || data == "no_media_found") {
    //            var err = "err01";
    //            callback(err, res, data);
    //        }
    //        else {
    //            var id = data.livestream[0].media_user_id
    //            request({
    //                url: "https://www.hitbox.tv/api/media/live/list.json?follower_id=" + id,json: true
    //            }, function(err, res, data) {
    //                if (err || data == "no_media_found") {
    //                    var err = "err02";
    //                    callback(err, res, data);
    //                }
    //                else {
    //                    callback(err, res, data);
    //                };
    //            });
    //        };
    //    });
    //},
    //
    //user: function(username, callback){
    //    request({
    //        url: "http://api.hitbox.tv/user/" + username + ".json",json: true
    //    }, function (err, res, data) {
    //        callback(err, res, data);
    //    });
    //},
    //followers: function(username, offset, limit, callback){
    //    request({
    //        url: "http://api.hitbox.tv/followers/user/" + username + ".json?offset=" + offset + "&limit=" + limit,json: true
    //    }, function (err, res, data) {
    //        callback(err, res, data);
    //    });
    //},
    //
    //games: function(callback){
    //    request({
    //        url: "http://api.hitbox.tv/games.json",json: true
    //    }, function (err, res, data) {
    //        callback(err, res, data);
    //    });
    //},
    //
    //teams: function(callback){
    //    request({
    //        url: "http://api.hitbox.tv/teams",json: true
    //    }, function (err, res, data) {
    //        callback(err, res, data);
    //    });
    //},
    //
    //team: function(team, callback){
    //    request({
    //        url: "http://api.hitbox.tv/teams/" + team + ".json",json: true
    //    }, function (err, res, data) {
    //        callback(err, res, data);
    //    });
    //},

    /*	authToken: function(username, password, device, callback){
     request({
     url: "http://api.hitbox.tv/auth/token?login=" + username + "&pass=" + password + "&app=" + device,json: true
     }, function (err, res, data) {
     callback(data);
     });
     }*/
};

module.exports.API = API;
module.exports.media = API.media;
module.exports.mediaUser = API.mediaUser;
//module.exports.mediaFollowing = API.mediaFollowing;
//module.exports.user = API.user;
//module.exports.followers = API.followers;
//module.exports.games = API.games;
//module.exports.teams = API.teams;
//module.exports.team = API.team;