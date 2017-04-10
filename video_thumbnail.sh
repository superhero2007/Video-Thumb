#!/bin/sh

usage()
{
	echo "usage: video_thumbnail.sh -i <input_video> -o <output_image> [optional -s <seek>]"
	exit 1
}

INFILE=""
OUTFILE=""
SEEK_TIME=0.5

while getopts ":i:o:s:" opt; do
	case $opt in
		i)
			INFILE=$OPTARG
			;;
		o)
			OUTFILE=$OPTARG
			;;
		s)
			SEEK_TIME=$OPTARG
			;;
		\?)
			usage
			;;
		:)
			usage
			;;
	esac
done
if [[ $INFILE = "" || $OUTFILE = "" ]]; then
	usage
fi

SEEK=$(ffprobe -v error -show_format $INFILE | grep duration | awk -F= '/duration/{print $NF}')
echo "Seeking to $SEEK" 
SEEK=$(echo "$SEEK * $SEEK_TIME" | bc)
echo "Seek value modified to $SEEK via bc" 
ffmpeg -ss $SEEK -i $INFILE -q:v 2 -frames:v 1 $OUTFILE
