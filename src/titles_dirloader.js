/**
 * Created by John on 2/22/2016.
 */
module.exports = function (dir, cachedData) {

    var fs = require('fs');

    function cache() {

        console.log("titles_dirloader::cache() loading files in " + dir);
        var files = fs.readdirSync(dir);
        for (var i in files) {
            var name = dir + '/' + files[i];
            if (!fs.statSync(name).isDirectory() && endsWith(files[i], '.json' )) {
                title_data = fs.readFileSync(name, 'utf-8');
                if (title_data) {
                    title_data = JSON.parse(title_data);
                    this.add(title_data.id,title_data);
                } else {
                    console.log('Failed to parse JSON from ' + name);
                }
            } else {
                console.log('titles_dirloader ignoring file: ' + name);
            }

        }

//            console.log("Cached Titles: " + JSON.stringify(cachedData));
    }

    this.getTitle = function(title_id) {
        return cachedData[title_id];
    }

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    this.add = function(key, data) {
        var exists = this.getTitle(key);
        if (!exists) {
            cachedData[key] = data;
        }
    }

    this.reload = function() {
        Array.clear(cachedData);
        cache();
    }

    // initial cache
    cache();
}