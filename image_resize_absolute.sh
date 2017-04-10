#!/bin/sh

usage()
{
	echo "usage: image_resize_absolute.sh -i <input_image> -o <output_image> -w <new_width> -h <new_height>"
	exit 1
}

INFILE=""
OUTFILE=""
W=0
H=0

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

if [[ $INFILE = "" || $OUTFILE = "" || $W < 0 || $H < 0 ]]; then
	usage
fi

convert $INFILE -resize $W"x"$H"!" $OUTFILE