#!/bin/sh

../lambda_fastload_sync.sh;
export PORT=4434;
export MEDIA_DIR_MODE=S3;
export MEDIA_CONTENT_PATH=media;
export AWS_CLOUDFRONT_URL=https://dde5gazvpvhmp.cloudfront.net;
export AWS_ACCESS_KEY_ID=AKIAJUYIVPHV5O2CHGAA;
export AWS_SECRET_ACCESS_KEY=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;
export FASTLOAD_LOW_QUALITY_COMPRESSION_PERCENTAGE=10;
export FASTLOAD_HIGH_QUALITY_COMPRESSION_PERCENTAGE=75;
node server.js

