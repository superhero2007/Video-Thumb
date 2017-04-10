#!/bin/bash

usage()
{
	echo "usage: image_resize_relative.sh -i <input_image> -o <output_image> -w <0-1> -h <0-1>"
	exit 1
}

INFILE=""
OUTFILE=""
W=1
H=1

while getopts ":i:o:w:h:" opt; do
	case $opt in
		i)
			INFILE=$OPTARG
			;;
		o)
			OUTFILE=$OPTARG
			;;
		w)
			W=$OPTARG
			;;
		h)
			H=$OPTARG
			;;
		:)
			usage
			;;
		\?)
			usage
			;;
	esac
done

if [[ $INFILE = "" || $OUTFILE = "" || $W < 0 || $W > 1 || $H < 0 || $H > 1 ]]; then
	usage
fi


ORIGINAL_WIDTH=$(identify -format "%w" $INFILE)
ORIGINAL_HEIGHT=$(identify -format "%h" $INFILE)

W=$(echo "$ORIGINAL_WIDTH * $W" | bc)
H=$(echo "$ORIGINAL_HEIGHT * $H" | bc)
W=${W%.*}
H=${H%.*}

convert $INFILE -resize $W"x"$H"!" $OUTFILE