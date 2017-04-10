/**
 * Created by John on 2/22/2016.
 */
var BroadcastProvider = require('./broadcast_provider');

module.exports = function (dir) {

    var fs = require('fs');

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    // simple getter
    function cache() {

        console.log("broadcasts_dirprovider::cache() loading files in " + dir);
        var files = fs.readdirSync(dir);
        for (var i in files) {
            var name = dir + '/' + files[i];
            if (!fs.statSync(name).isDirectory() && endsWith(files[i], '.json')) {
                broadcast_data = fs.readFileSync(name, 'utf-8');
                if (broadcast_data) {
                    broadcast_data = JSON.parse(broadcast_data);
                    var parsed_info = parseTitleID(files[i]);
                    if (parsed_info) {
                        broadcast_data.type = "VOD";
                        var pvdr = BroadcastProvider.getInstance(parsed_info.title_id);
                        pvdr.createVOD(broadcast_data);
                    } else {
                        console.log('Failed to determine publisher and title from ' + files[i]);
                    }
                } else {
                    console.log('Failed to parse JSON from ' + name);
                }
            } else {
                console.log('broadcasts_dirprovider ignoring file: ' + name);
            }
        }

//        console.log("Cached " + JSON.stringify(cachedData));
    }

    // initial cache
    cache();
}

function parseTitleID(filename) {
    if (!filename) return null;
    var start_pos = filename.indexOf('_');
    if (start_pos !== -1) {
        var end_pos = filename.lastIndexOf('_');
        if (end_pos > start_pos) {
            var title_id = filename.substr(0, start_pos);
            start_pos++;
            var publisher_id = filename.substr(start_pos, end_pos - start_pos);
            console.log("Parsed title_id: " + title_id + " from filename for publsher " + publisher_id);
            return { "title_id": title_id, "publisher_id":publisher_id };
        }
    }

    console.log("broadcasts_dirprovider: failed to parse title id from " + filename);
    return null;
}
