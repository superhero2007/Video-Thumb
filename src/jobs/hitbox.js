/**
 * Created by John on 2/19/2016.
 */
var hitboxSvc = hitboxSvc || require("../services/hitbox");

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, position) {
        var subjectString = this.toString();
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

function HitboxBase(){

};


/**
 * Titles can stick around.  Make sure to wipe out the hitbox counts
 * prior to processing the next set of live streams
 *
 * @param callback(err)
 */
HitboxBase.prototype.resetTitleCounts = function(callback) {
    console.log("clear out all previous Hitbox titles counts");
};
/**
 * Broadcasts come and go.  Remove the old ones before inserting the new ones
 *
 * @param callback(err)
 */
HitboxBase.prototype.archiveBroadcasts = function(callback) {
    //Broadcasts come and go... Titles can stick around
    console.log("Do not remove... change status");
};

/**
 * From the original Hitbox stream object, create (or update) the Title and
 * make sure the Broadcast exists
 *
 * @param stream         - JSON object brom hitbox
 * @param run_date       - timestamp to mark this run
 * @param callback(err)  - error handler for caller
 */
HitboxBase.prototype.createOrUpdateTitleAndBroadcast = function(stream, run_date, callback) {
    console.log("override me");
};

/**
 * Main logic for processing the Hitbox load job
 *
 * @param callback(err)
 */
HitboxBase.prototype.execute = function(self, callback) {
    //Step 1: Call  https://api.hitbox.tv/media/live/list.json?limit=1000  to get the list of live broadcasts
    var liveLimit = 1000; //limit parameter for the live stream API call
    console.log("Starting Hitbox Job: " + new Date());
    hitboxSvc.media(function (err, res, data) {
        if (err) {
            console.log("Unable to get data from Hitbox! : " + err.message)
            callback(err);
        }
        if (data && data.livestream) {
            var livestreams = data.livestream;
            var now = new Date();
            self.resetTitleCounts(callback);
            //Step 2: For each Broadcast:
            for (var i = 0; i < livestreams.length; i++) {
                var stream = livestreams[i];
                self.createOrUpdateTitleAndBroadcast(stream, now, function(err) {
                    if (err) {
                        //TODO: Anything else?  Break loop?
                        callback(err);
                    }
                });
            }
            self.archiveBroadcasts(callback);
            console.log("Finished Hitbox Job: " + new Date());
        }
    }, liveLimit);

    callback(null);
};

HitboxBase.prototype.HitboxBase = HitboxBase;


module.exports = HitboxBase;