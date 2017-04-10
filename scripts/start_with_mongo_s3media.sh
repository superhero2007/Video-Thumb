#!/bin/sh

../hp_sync.sh;
export PORT=4434;
export LOCATION_PROVIDER_MODE=MONGO;
export MEDIA_DIR_MODE=S3;
export MEDIA_CONTENT_PATH=media;
export AWS_CLOUDFRONT_URL=https://dde5gazvpvhmp.cloudfront.net;
export AWS_ACCESS_KEY_ID=AKIAIZYQRFZ773M2SEQQ;
export AWS_SECRET_ACCESS_KEY=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
export FASTLOAD_GENERATE_URI=https://3benx9arya.execute-api.us-east-1.amazonaws.com/dev
export VIDEO_THUMBNAIL_GENERATE_URI=https://mhxkv2pjs5.execute-api.us-east-1.amazonaws.com/dev
node server.js

