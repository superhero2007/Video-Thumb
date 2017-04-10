module.exports = function() {

    var cachedConfig = null;
    var fs = require('fs');

    var static_config_file = "./client_config.json";

    function cache() {
        if (!fs.statSync(static_config_file).isDirectory()) {
            config_data = fs.readFileSync(static_config_file, 'utf-8');
            if (config_data) {
                cachedData = cachedConfig = JSON.parse(config_data);
            } else {
                console.log('Failed to parse config JSON from ' + static_config_file + ". This is bad.");
            }
        }
    }

    // simple getter
    this.doit = function(session_id) {

        var config = cachedData;

        // if a session exists, dont set a new one, otherwise, generate one
        var current_session = session_id;
        if (!session_id) {
            var FlakeIdGen = require('flake-idgen')
                , intformat = require('biguint-format')
                , generator = new FlakeIdGen;

            current_session= intformat(generator.next(), 'dec');
        }

        config.session.s_id = current_session;

        return config;
    }

    // initial cache
    cache();
}
