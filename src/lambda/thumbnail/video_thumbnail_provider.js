/*jslint node: true */
"use strict";

var s3_provider = s3_provider || require ('./s3_provider');
var lambda_utils = require("./lambda_utils");
var fs = require('fs');

function VideoThumbnailProvider() {
    this.working_dir = process.cwd() + '/lambda/ext';
}

VideoThumbnailProvider.prototype.processVideo = function(bucket_name, key, destination) {

    console.log("VideoThumbnailProvider|processVideo|Handling " + bucket_name + " and " + key);
    if (!destination) {
        destination = '/tmp';
    }

    var file_info = lambda_utils.parseKey(key);
    if (!file_info) { throw new Error("Failed to parse media key: " + key); }

    var local_filename = destination + '/' + file_info.file_path.replace(/([^a-z0-9\-.]+)/gi, '_');

    //TODO this replaces and deals with just mp4 files and NOTHING ELSE.
    var output_filename = local_filename.replace(/(\.mp4)/gi, '.jpg');
    var final_output;

    var thumbnail_response = {
        media_key: file_info.media_path + '/' + file_info.filename + '.jpg',
        display_image: null,
        mime_type: 'image/jpeg',
        asset_type: 'image',
        size_bytes: null,
        key_frames: null
    };

    console.log("VideoThumbnailProvider|processVideo|trying download from S3 to fill " + JSON.stringify(thumbnail_response));

    //Get the S3 resource and copy it locally. Input is where the remote s3 video file will be saved locally.
    return s3_provider.get(bucket_name, key, local_filename)
            .then(function(file_path){
                console.log("VideoThumbnailProvider|processVideo|s3_provider get finished " + file_path);
                return createImageFromVideo(file_path, output_filename);
            })
            .then(function(output_file) {
                final_output = output_file;
                var processed_file_info = lambda_utils.parseKey(output_file);
                return new Promise(function(resolve, reject) {
                    // Upload the resulting output image to s3.
                    s3_provider.putFile(bucket_name, file_info.media_path + '/' + processed_file_info.file_path, output_file, 'image/jpeg', false,
                        function (s3_details) {
                            console.log("VideoThumbnailProvider|processVideo|s3_provider put finished " + JSON.stringify(s3_details));
                            s3_details.media_name = processed_file_info.filename
                            resolve(s3_details);
                        },
                        function (error) {
                            console.log("VideoThumbnailProvider|processVideo|s3_provider put failed: " + error);
                            reject(error);
                        });
                });
            })
            .then(function(s3_details) {

                var stats = fs.statSync(final_output);
                thumbnail_response.size_bytes = stats['size'];
                thumbnail_response.display_image = s3_details.Location;

                console.log("VideoThumbnailProvider|processVideo|cleaning up temp output file: " + final_output);
                fs.unlink(final_output);
                return thumbnail_response;
            }).catch(e => {
                if (!e.code || e.code !== "NoSuchKey") {
                    console.log("VideoThumbnailProvider|processVideo|FAILED to Process " +  key);
                    console.log("VideoThumbnailProvider|processVideo|" + JSON.stringify(e));
                    console.log("VideoThumbnailProvider|processVideo|"+ e.stack);
                }
                throw e;
            }).finally(function() {
                console.log("VideoThumbnailProvider|processVideo|cleaning up temp input file: " + local_filename);
                fs.unlink(local_filename);
            });

};

function createImageFromVideo(input_video, output_image) {
    console.log("VideoThumbnailProvider|createImageFromVideo|Generating image for " + JSON.stringify(input_video));
    try {
        var cp = require('child_process');
        cp.execFileSync('video_thumbnail.sh', ['-i', input_video, '-o', output_image], { stdio:[0,1,2] });
        return output_image;
    } catch (err) {
        console.log("failed to create thumb image for " + input_video + ". err: " + err);
        console.log(err.stack);
        return false;
    }

}

VideoThumbnailProvider.prototype.VideoThumbnailProvider = VideoThumbnailProvider;

var Promise = require('bluebird');
var video_thumbnail_provider = module.exports = exports = Promise.promisifyAll(new VideoThumbnailProvider());