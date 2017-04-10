parseKey = function(key) {
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


module.exports = {
    parseKey: parseKey
};