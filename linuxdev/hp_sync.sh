#!/bin/bash

if [ ! -d ~/node-contentapi/data ]; then
  mkdir ~/node-contentapi/data
fi

if [ ! -d ~/node-contentapi/scripts ]; then
  mkdir ~/node-contentapi/scripts
fi

rsync -avz --progress /devel/node-hashplay-contentapi/scripts/ ~/node-contentapi/scripts/
rsync -avz --progress /devel/node-hashplay-contentapi/src/ ~/node-contentapi/
rsync -avz --progress /devel/data-hashplay-democontent/ ~/node-contentapi/data/
