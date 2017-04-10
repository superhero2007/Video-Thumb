#!/bin/bash

rsync -avz --progress /devel/node-hashplay-contentapi/src/lambda/fastload/ ~/lambda-fastload/
rsync -avz --progress /devel/node-hashplay-contentapi/src/version_provider.js /devel/node-hashplay-contentapi/src/s3_provider.js /devel/node-hashplay-contentapi/src/utilities.js ~/lambda-fastload/
rsync -avz --progress /devel/node-hashplay-contentapi/bc /devel/node-hashplay-contentapi/*.sh ~/lambda-fastload/
