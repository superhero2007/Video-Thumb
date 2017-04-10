var Promise = require('bluebird');
//var fs      = Promise.promisifyAll(require('fs'));
var fs      = require('fs');
var https   = require('https');
var AWS     = require('aws-sdk');
var zlib    = require('zlib');

function S3Provider() {

    AWS.config.region = (process.env.AWS_REGION) ? (process.env.AWS_REGION) : 'us-east-1';
    AWS.config.setPromisesDependency(require('bluebird'));
    var max_part_size = (process.env.AWS_S3_MAX_PART_SIZE) ? (process.env.AWS_S3_MAX_PART_SIZE) : '20971520'; // 20MB
    this.maxPartSize  = parseInt(max_part_size, 10);
    this.s3Stream     = require('s3-upload-stream')(new AWS.S3()),
    console.log("S3Provider|ctor|AWS_REGION: " + AWS.config.region);
    console.log("S3Provider|ctor|AWS_S3_MAX_PART_SIZE: " + this.maxPartSize);
}
//adding code here
S3Provider.prototype.get = function(bucket, key, destination) {

    if (!destination || destination.length <= 0) {
        throw new Error("destination cannot be empty");
    }

    console.log("S3Provider|get|" + bucket + "," + key, "," + destination);
    var s3 = new AWS.S3();
    var params = { Bucket: bucket, Key: key};

    var file = fs.createWriteStream(destination);

    return new Promise(function(resolve, reject) {
            var stream = s3.getObject(params).createReadStream();
            stream.pipe(file);

            stream.on('error', function (error) {
                console.log(error);
                reject(error);
            });

            stream.on('end', function () {
                console.log('file copied from s3 to ' + destination);
                resolve(destination);
            });
        });
};

S3Provider.prototype.putFile = function(bucket, file_key, path_to_file, content_type, use_gzip, complete_callback, error_callback) {

    // Create the streams
    var fileStream = fs.createReadStream(path_to_file);
    var upload = this.s3Stream.upload({
        Bucket: bucket,
        Key: file_key,
        ACL: 'public-read',
        StorageClass: 'STANDARD',
        ContentType: content_type
    });

    // Optional configuration
    upload.maxPartSize(this.maxPartSize);
    upload.concurrentParts(5);

    // Handle errors.
    upload.on('error', function (error) {
        console.log("Error uploading " + file_key + ".  error: " + error);
        if (error_callback) {
            error_callback(error);
        }
    });

    /* Handle progress. Example details object:
       { ETag: '"f9ef956c83756a80ad62f54ae5e7d34b"',
         PartNumber: 5,
         receivedSize: 29671068,
         uploadedSize: 29671068 }
    */
    upload.on('part', function (details) {
      console.log("Finished uploading part " + details.PartNumber + " of " + file_key + " to S3. " + JSON.stringify(details));
    });

    /* Handle upload completion. Example details object:
       { Location: 'https://bucketName.s3.amazonaws.com/filename.ext',
         Bucket: 'bucketName',
         Key: 'filename.ext',
         ETag: '"bf2acbedf84207d696c8da7dbb205b9f-5"' }
    */
  upload.on('uploaded', function (details) {
      console.log(details);
      if (complete_callback) {
        complete_callback(details);
      }
    });

    // Pipe the incoming filestream through compression, and up to S3.
    if (use_gzip) {
        var compress = zlib.createGzip();
        fileStream.pipe(compress).pipe(upload);
    } else {
        fileStream.pipe(upload);
    }
    return "requested put";
};

S3Provider.prototype.deleteFile = function(bucket, file_key, complete_callback) {
    var params = {
        Bucket: bucket,
        Key: file_key
    };

    var s3 = new AWS.S3();
    console.log("requested delete of " + bucket + ":" + file_key);
    s3.deleteObject(params, complete_callback);
    return "requested delete of " + bucket + ":" + file_key;
}

S3Provider.prototype.S3Provider = S3Provider;

var s3_provider = module.exports = exports = Promise.promisifyAll(new S3Provider());
