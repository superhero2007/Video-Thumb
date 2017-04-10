
function LocationDirLoader(dir) {
    console.log("In the LocationProvider c'tor: " + dir)
    this.directory = dir;
    this.cachedData = {};
    this.load_dts = new Date().toJSON();
};

LocationDirLoader.prototype.cache = function() {

        if (this.directory == null || this.directory == "") {
            console.log("Cannot cache an empty directory");
            return;
        }
        var fs = require('fs');

        console.log("locations_dirloader::cache() loading files in " + this.directory);
        var files = fs.readdirSync(this.directory);
        for (var i in files) {
            var name = this.directory + '/' + files[i];
            if (!fs.statSync(name).isDirectory() && endsWith(files[i], '.json')) {
                location_data = fs.readFileSync(name, 'utf-8');
                if (location_data) {
                    location_data = JSON.parse(location_data);
                    var location_id = parseLocationID(files[i]);
                    if (location_id) {
                        console.log("Parsed location " + location_id + " from " + files[i]);
                        location_data.mdts = new Date().toJSON();
                        this.cachedData[location_id] = location_data;
                    } else {
                      console.log('Skipping: ' + name);
                    }
                } else {
                    console.log('Failed to parse JSON from ' + name);
                }
            } else {
                console.log('locations_dirprovider ignoring file: ' + name);
            }
        }
    }

LocationDirLoader.prototype.get = function() {
        var locs = [];
        for (var loc_id in this.cachedData) {
            locs.push(this.cachedData[loc_id]);
        }
        return locs;
    };

LocationDirLoader.prototype.getById = function(id) {
       return this.cachedData[id];
    };

LocationDirLoader.prototype.getByUser = function(user_id) {
        var locs = [];
        for (var loc_id in this.cachedData) {
            if (this.cachedData[loc_id].owner == user_id) {
                locs.push(this.cachedData[loc_id]);
            }
        }
        return locs;
    };

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

function parseLocationID(filename) {
    if (!filename) return null;
    var dot_pos = filename.lastIndexOf('.');
    if (dot_pos !== -1 && dot_pos > 0) {
        return filename.substr(0, dot_pos)
    }

    console.log("locations_dirprovider: failed to parse location name from " + filename);
    return null;
};

LocationDirLoader.prototype.LocationDirLoader = LocationDirLoader;

module.exports = exports = LocationDirLoader;
var location_dir_loader = null;

module.exports.getInstance = function(dir) {
    if (null == location_dir_loader) {
        location_dir_loader = new LocationDirLoader(dir);;
        location_dir_loader.cache();
    }
    return location_dir_loader;
}
