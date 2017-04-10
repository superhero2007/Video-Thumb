#!/bin/bash

rsync -avz --progress /devel/node-hashplay-contentapi/src/lambda/thumbnail/ ~/lambda-thumbnail/
rsync -avz --progress /devel/node-hashplay-contentapi/src/version_provider.js /devel/node-hashplay-contentapi/src/s3_provider.js /devel/node-hashplay-contentapi/src/utilities.js ~/lambda-thumbnail/
# rsync -avz --progress /devel/node-hashplay-contentapi/bc /devel/node-hashplay-contentapi/*.sh ~/lambda-thumbnail/
