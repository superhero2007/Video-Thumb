#!/bin/sh

usage()
{
	echo "usage: image_split.sh -i <input_image> -o <output_image> -x <0-1> -y <0-1> -w <0-1> -h <0-1>"
	exit 1
}

INFILE=""
OUTFILE=""
X=0
Y=0
W=1
H=1

while getopts ":i:o:x:y:w:h:" opt; do
	case $opt in
		i)
			INFILE=$OPTARG
			;;
		o)
			OUTFILE=$OPTARG
			;;
		x)
			X=$OPTARG
			;;
		y)
			Y=$OPTARG
			;;
		w)
			W=$OPTARG
			;;
		h)
			H=$OPTARG
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

if [[ $X < 0 || $X > 1 || $Y < 0 || $Y > 1 ]]; then
	usage
fi


ORIGINAL_WIDTH=$(identify -format "%w" $INFILE)
ORIGINAL_HEIGHT=$(identify -format "%h" $INFILE)

OFFSET_X=$(echo "$ORIGINAL_WIDTH * $X"  | bc)
OFFSET_X=${OFFSET_X%.*}

OFFSET_Y=$(echo "$ORIGINAL_HEIGHT * $Y" | bc)
OFFSET_Y=${OFFSET_Y%.*}

WIDTH=$(echo "$ORIGINAL_WIDTH * $W" | bc)
WIDTH=${WIDTH%.*}

HEIGHT=$(echo "$ORIGINAL_HEIGHT * $H" | bc)
HEIGHT=${HEIGHT%.*}

convert $INFILE -crop $WIDTH"x"$HEIGHT"+"$OFFSET_X"+"$OFFSET_Y $OUTFILE
