function TitleDirProvider (cachedData) {
    this.cachedData = cachedData;
}


TitleDirProvider.prototype.getTitle = function(title_id) {
        return this.cachedData[title_id];
    };

TitleDirProvider.prototype.setTitle = function(title_id, title_data) {
    this.cachedData[title_id] = title_data;
    };

    // simple getter
TitleDirProvider.prototype.get = function() {
        return this.cachedData;
    };

TitleDirProvider.prototype.add = function(key, data) {
        var exists = this.getTitle(key);
        if (!exists) {
            this.setTitle(key,data);
        }
    };

TitleDirProvider.prototype.updateCurData = function(title_id, cur_data) {
        var exists = this.getTitle(title_id);
        if (exists) {
            exists.cur_data = Object.assign({}, cur_data); //must clone, otherwise pass by ref causes every title to increment
            this.cachedData[title_id] = exists;
            return exists;
        }
        return null;
    };

TitleDirProvider.prototype.incrementCurData = function(title_id, cur_data) {
    var exists = this.getTitle(title_id);
    if (exists) {
        if (cur_data.count_2D) {
            exists.cur_data.count_2D++;
        }
        if (cur_data.count_3D) {
            exists.cur_data.count_3D++;
        }
        if (cur_data.count_VR) {
            exists.cur_data.count_VR++;
        }
        if (cur_data.bcast_count) {
            exists.cur_data.bcast_count++;
        }
        this.cachedData[title_id] = exists;
        return exists;
    }
    return null;
};

TitleDirProvider.prototype.decrementCurData = function(title_id, cur_data) {
    var exists = this.getTitle(title_id);
    if (exists) {
        if (cur_data.count_2D) {
            exists.cur_data.count_2D--;
        }
        if (cur_data.count_3D) {
            exists.cur_data.count_3D--;
        }
        if (cur_data.count_VR) {
            exists.cur_data.count_VR--;
        }
        if (cur_data.bcast_count) {
            exists.cur_data.bcast_count--;
        }
        this.cachedData[title_id] = exists;
        return exists;
    }
    return null;
};

TitleDirProvider.prototype.upsert = function(title, callback) {
    var exists = this.getTitle(title.id);
    if (exists) {
        exists.title = title.title;
        exists.cover_art = title.cover_art;
        exists.last_update = title.last_update;
        exists.cur_data.count_2D++;
        exists.cur_data.bcast_count++;
        exists.header = {
            cdts: exists.header.cdts,
            mdts: (title.header.mdts) ? title.header.mdts : title.header.cdts,
            status: 'loading',
            object_type: 'Title'
        }
        this.setTitle(title.id, exists);
    } else {
        this.add(title.id, title);
        exists = title;
    }
    callback(null);
    return exists;
}

TitleDirProvider.prototype.TitleDirProvider = TitleDirProvider;

module.exports = TitleDirProvider;