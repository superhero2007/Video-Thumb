module.exports = function (file, render, refresh) {
    var cachedData = null;
    var fs = require('fs');

    function cache() {

//        console.log("CachedRenderer::cache() building for " + file);
        cachedData = render(fs.readFileSync(file, 'utf-8'));
//            console.log("Cached Data: " + cachedData);

        // Watch the file if, needed and re-render + cache it whenever it changes
        // you may also move cachedRenderer into a different file and then use a global config option instead of the refresh parameter
        if (refresh) {
            fs.watchFile(file, {'persistent': true, 'interval': 100}, function() {
                cache();
            });
            refresh = false;
        }
    }

    // simple getter
    this.getData = function() {
        return cachedData;
    }

    // initial cache
    cache();
}

