#!/bin/sh

# Usage info
show_help() {
cat << EOF
Usage: ${0##*/} [-h] [-s SERVER(:PORT)] [-d DATABASE] [-c COLLECTION] [-k upsertFields] [DIRECTORY]...
Process directory and batch upload all JSON files to the configured  mongo server
    -h               display this help and exit
    -s SERVER(:PORT) host to connect to with optional port, defaults to localhost and default mongo port
    -d DATABASE      database name
    -c COLLECTION    collection name
    -k KEYFIELDS     fields to be used as identity fields for upsert.  See upsertFields in mongoimport documentation    
EOF
}

# Initialize our own variables:
server="localhost"
db=""
coll=""
username=""
password=""
upsertFields=""
verbose=0

OPTIND=1 # Reset is necessary if getopts was used previously in the script.  It is a good idea to make this local in a function.
while getopts "hvs:d:c:u:p:k:" opt; do
    case "$opt" in
        h)  show_help
            exit 0
            ;;
        s)  server=$OPTARG
            ;;
        d)  db=$OPTARG
            ;;
        c)  coll=$OPTARG
            ;;
        u)  username=$OPTARG
            ;;
        p)  password=$OPTARG
            ;;
        k)  upsertFields=$OPTARG
            ;;  
        v)  verbose=$((verbose+1))
            ;;        
       \?)
            show_help >&2
            exit 1
            ;;
        :)
            echo "Option -$OPTARG requires an argument." >&2
            show_help >&2
            echo "should exit  here"
            exit 1
            ;;
    esac
done
shift "$((OPTIND-1))" # Shift off the options and optional --.

directory=$1

if [ -z "$directory" ]; then
    echo "Directory cannot be empty"
    exit 1
fi

if [ -z "$db" ]; then
    echo "Database cannot be empty (-d)"
    exit 1
fi

if [ -z "$coll" ]; then
    echo "Collection cannot be empty (-c)"
    exit 1
fi

args="-h $server -d $db -c $coll"

if [ ! -z "$server" ]; then
    args=$args" -h $server"
fi

if [ ! -z "$username" ]; then
    args=$args" -u $username"
fi

if [ ! -z "$password" ]; then
    args=$args" -p $password"
fi

if [ ! -z "$upsertFields" ]; then
    args=$args" --upsertFields $upsertFields"
fi

if (($verbose > 0)); then
    args=$args" --verbose=$verbose"
fi

args=$args" --type=json"
#if (($verbose > 0); then
    echo "Import arguments: $args"
#fi

ls -1 $directory/*.json | while read jsonfile; do mongoimport $args --file=$jsonfile; done
