convertHitboxToHashplayBroadcast = function(clip, stream, publisher) {

    // TODO: Add validation around hitbox data that we require

    var bcastUrl = cleanupURL(clip.url, clip.bitrates);
    var broadcast = {
        id: stream.media_id,
        name: stream.media_display_name,
        title_id: stream.category_id,
        type: clip.type,
        format: "2D",
        start_time: convertHitboxDateTimeToHashplayDateTime(stream.media_live_since),
        broadcast_uri: bcastUrl,
        recorded_filename: '',
        screenshots: [],
        screenshot_filename: '',
        provider: 'hitbox',
        publisher_name: publisher,
        participants: [],
        observers: [],
        header: {
            cdts: Date.now(),
            mdts: Date.now(),
            status: 'loading',
            object_type: 'broadcast'
        }
    };

    return broadcast;
};

cleanupURL = function(url, bitrates){
    var baseHost = "http:\/\/api.hitbox.tv";
    var baseURL = baseHost + "\/player\/hls";
    var out = url;
    if (!out) {
        out = "";
    }
    if (out.startsWith("\/api\/")) {
        out = url.replace("\/api", baseHost);
    }
    if (!out.startsWith("http")) {
        if (!out.startsWith("\/")) {
            out = "\/" + out;
        }
        out = baseURL + out;
    }
    if (bitrates) {
        for (var b = 0; b < bitrates.length; b++) {
            var br = bitrates[b];
            if (br && br.url) {
                if (br.url.startsWith("http")) {
                    out = br.url;
                }
            }
        }
    }
    return out;
};

convertHitboxDateTimeToHashplayDateTime = function(dt) {
    return dt.replace(' ', 'T') + '.000Z';
};

module.exports = {
    cleanupURL: cleanupURL,
    convertHitboxToHashplayBroadcast: convertHitboxToHashplayBroadcast,
    convertHitboxDateTimeToHashplayDateTime: convertHitboxDateTimeToHashplayDateTime
};