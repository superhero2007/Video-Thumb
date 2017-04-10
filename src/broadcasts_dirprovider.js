function BroadcastDirProvider(cachedData) {
    this.cachedData = cachedData;
}

        // simple getter
BroadcastDirProvider.prototype.get = function(title_id) {
        if (title_id && title_id in cachedData) {
            return this.cachedData[title_id];
        }
        return null;
    };

BroadcastDirProvider.prototype.add = function(key, data) {
        var exists = this.get(key);
        if (!exists) {
            this.cachedData[key].push(data);
        } else {
            if (exists.indexOf(data) < 0) {
                this.cachedData[key].push(data);
            }
        }
    };
    


BroadcastDirProvider.prototype.BroadcastDirProvider = BroadcastDirProvider;

module.exports = BroadcastDirProvider;