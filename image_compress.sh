#!/bin/sh

usage()
{
	echo "usage: image_compress.sh -i <input_image> -o <output_image> -q <0-100>"
	exit 1
}

QUALITY=""
INFILE=""
OUTFILE=""

while getopts ":i:o:q:" opt; do
	case $opt in
		i)
			INFILE=$OPTARG
			;;
		o)
			OUTFILE=$OPTARG
			;;
		q)
			QUALITY=$OPTARG
			;;
		:)
			usage
			;;
		\?)
			usage
			;;
	esac
done

if [[ $INFILE = "" || $OUTFILE = "" || $QUALITY = "" || $QUALITY < 0 ]]; then
	usage
fi

convert -strip -interlace Plane -quality $QUALITY"%" $INFILE $OUTFILE