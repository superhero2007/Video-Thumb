module.exports = function(mongoHost, mongoDbName, mongoUser, mongoPass) {
    var mongoose = require('mongoose');
    var Promise = require('bluebird');
    mongoose.Promise = Promise;

    var dbURI = 'mongodb://' + mongoHost + '/' + mongoDbName;
    var connectOptions = {};
    if (mongoUser) {
        connectOptions.user = mongoUser;
        if (mongoPass) { connectOptions.pass = mongoPass; }
    }

    mongoose.connect(dbURI, connectOptions);
    // CONNECTION EVENTS
    // When successfully connected
    mongoose.connection.on('connected', function () {
        console.log('Mongoose default connection open to ' + dbURI);
    });

    // If the connection throws an error
    mongoose.connection.on('error',function (err) {
        console.log('Mongoose default connection error: ' + err);
    });

    // When the connection is disconnected
    mongoose.connection.on('disconnected', function () {
        console.log('Mongoose default connection disconnected');
    });

    // If the Node process ends, close the Mongoose connection
    process.on('SIGINT', function() {
        mongoose.connection.close(function () {
            console.log('Mongoose default connection disconnected through app termination');
            process.exit(0);
        });
    });

    require("./title");
    require("./media");
    require("./broadcast");
    require("./location");
}
