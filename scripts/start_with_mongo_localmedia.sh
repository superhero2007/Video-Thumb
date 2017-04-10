#!/bin/sh

../hp_sync.sh;
export PORT=4434;
export LOCATION_PROVIDER_MODE=MONGO;
node server.js

