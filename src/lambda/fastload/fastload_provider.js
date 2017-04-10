var s3_provider = s3_provider || require ('./s3_provider');
var fs = require('fs');

function FastloadProvider() {
    this.working_dir = process.cwd() + '/lambda/ext';
}

FastloadProvider.prototype.processImage = function(bucket_name, key, destination) {

    if (!destination) {
        destination = '/tmp';
    }

    var file_info = parseKey(key);
    if (!file_info) { throw new Error("Failed to parse media key: " + key); }

    var local_filename = destination + '/' + file_info.file_path.replace(/([^a-z0-9\-.]+)/gi, '_');

    var fastload_response = {
      "media_key": key,
      "full_lores": null,
      "middle": null,
      "left": null,
      "right": null
    };
    return s3_provider.get(bucket_name, key, local_filename)
        .then(function(file_path){
            return doProcessing(parseKey(file_path), this.working_dir);
        })
        .map(function(file_details) {
            var processed_file_info = parseKey(file_details.path);
            return promise = new Promise(function(resolve, reject) {
                s3_provider.putFile(bucket_name, file_info.media_path + '/' + processed_file_info.file_path, file_details.path, 'image/jpeg', false,
                    function (s3_details) {
                        console.log("FastloadProvider|processImage|s3_provider finished " + JSON.stringify(s3_details));
                        file_details.filename = processed_file_info.file_path;
                        resolve(file_details);
                    },
                    function (error) {
                        console.log("FastloadProvider|processImage|s3_provider failed: " + error);
                        reject(error);
                    });
            });
        })
        .each(function(file_details) {
            console.log("FastloadProvider|processImage|cleaning up temp file: " + file_details.path);
            fs.unlink(file_details.path);
            fastload_response[file_details.image_type] = file_details.filename;
        }).then(function(results) {
            console.log("FastloadProvider|processImage|then after each results: " + JSON.stringify(results));
            return fastload_response;
        })
        .catch(e => {
            if (!e.code || e.code !== "NoSuchKey") {
                console.log("FAILED to Process " +  key);
                console.log(JSON.stringify(e));
                console.log(e.stack);
            }
            throw e;
        }).finally(function() {
            fs.unlink(local_filename);
        });
};

function doProcessing(file_info, working_dir) {
    console.log("FastloadProvider|doProcessing|Generating fastload images for " + JSON.stringify(file_info));
    try {
        var cp = require('child_process');
        var proc = cp.execFileSync('create_fastload_pieces.sh',
            [
                '-i', file_info.original,
                '-l', process.env['FASTLOAD_LOW_QUALITY_COMPRESSION_PERCENTAGE'],
                '-h', process.env['FASTLOAD_HIGH_QUALITY_COMPRESSION_PERCENTAGE']
            ],
            { stdio:[0,1,2] });// cwd: working_dir
        return [
            { image_type: 'full_lores', path: file_info.media_path + '/' + file_info.filename + '_05.' + file_info.extension },
            { image_type: 'middle', path: file_info.media_path + '/' + file_info.filename + '_m25.' + file_info.extension },
            { image_type: 'left', path: file_info.media_path + '/' + file_info.filename + '_l25.' + file_info.extension },
            { image_type: 'right', path: file_info.media_path + '/' + file_info.filename + '_r25.' + file_info.extension }
        ];
    } catch (err) {
        console.log("FastloadProvider|doProcessing|Failed to create fastload images for " + file_info.file_path + ". err: " + err);
        console.log(err.stack);
        throw err;
    }
};

function parseKey(key) {
    if (!key) return null;

    var filename = null;
    var media_path = null;
    var ext = null;

    var slash_pos = key.lastIndexOf('/');
    if (slash_pos !== -1 && slash_pos > 0) {
        media_path = key.substr(0, slash_pos);
    } else {
        slash_pos = -1;
    }

    var dot_pos = key.lastIndexOf('.');
    if (dot_pos !== -1 && dot_pos > 0) {
        filename = key.substr(slash_pos+1, dot_pos-(slash_pos+1));
        ext = key.substr(dot_pos+1, key.length-(dot_pos+1));
    }

    return {
        original: key,
        media_path: media_path,
        filename: filename,
        extension: ext,
        file_path: filename + '.' + ext
    };
};

FastloadProvider.prototype.FastloadProvider = FastloadProvider;

var Promise = require('bluebird');
var fastload_provider = module.exports = exports = Promise.promisifyAll(new FastloadProvider());
