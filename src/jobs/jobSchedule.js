/**
 * Created by John on 2/22/2016.
 */
module.exports = function(cronJSON) {
    var CronJob = require('cron').CronJob;
    var hbJobObj = require("./hitbox_cache");
    var hbJob =  null;
    var hbCron = cronJSON.hitbox;
    //Do not allow to run every second
    if (hbCron !== "* * * * *" && hbCron !== "") {
        hbJob = new CronJob({
            cronTime: hbCron,
            onTick: function () {
                /*
                 * Runs on cron.
                 */
                hbJobObj.execute(function (err) {
                    if (err) console.log(err);
                });
            },
            onComplete: function () {
                //WARNING: WOULD NOT FIRE FOR ME.  Supposed to fire at the end of the job

            },
            start: false
        });

        hbJob.start();
    }

}