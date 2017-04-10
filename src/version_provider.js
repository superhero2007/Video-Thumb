module.exports = function (name) {

    var version = 'a.b.c';
    var fs = require('fs');

    var path = require('path');
    var logname = path.basename(__filename);

    function cache() {

	    var package_info = fs.readFileSync('package.json', 'utf-8');
        if (package_info) {
            var package_data = JSON.parse(package_info);
            version = package_data.version;
            console.log(logname + ":: Loaded " + version + " from package.json");
        } else {
		    console.log(logname + ":: Failed to load package.json looking for version number");
	    }
    }

    this.getVersion = function() {
        return version;
    }

    cache();
}