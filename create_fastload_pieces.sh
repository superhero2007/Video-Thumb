#!/bin/sh

usage()
{
	echo "usage: create_fastload_pieces.sh -i <input_image> -l <0-100> -h <0-100>"
	exit 1
}

INFILE=""
LQUALITY="10"
HQUALITY="75"

while getopts ":i:l:h:" opt; do
	case $opt in
		i)
			INFILE=$OPTARG
			;;
		l)
			LQUALITY=$OPTARG
			;;
		h)
			HQUALITY=$OPTARG
			;;
		:)
			usage
			;;
		\?)
			usage
			;;
	esac
done

if [[ $INFILE = "" ]]; then
	usage
fi

if [[ "$LQUALITY" -lt 0 || "$LQUALITY" -gt 100 ]]; then
        echo "invalid -l value: $LQUALITY"
        usage
fi

if [[ "$HQUALITY" -lt 0 || "$HQUALITY" -gt 100 ]]; then
        echo "invalid -l value: $HQUALITY"
        usage
fi

FILENAME="${INFILE%.*}"

# Create low-quality 5% complete image
LOWQUALITYFULL=$FILENAME"_05.jpg"
./image_compress.sh -i $FILENAME".jpg" -o $LOWQUALITYFULL -q $LQUALITY

# Create medium 25% images of left, right and center
MIDDLEFILE=$FILENAME"_m25.jpg"
./image_split.sh -i $INFILE -o $MIDDLEFILE -x 0.25 -y 0 -w 0.5 -h 1
./image_compress.sh -i $MIDDLEFILE -o $MIDDLEFILE -q $HQUALITY

LEFTFILE=$FILENAME"_l25.jpg"
./image_split.sh -i $INFILE -o $LEFTFILE -x 0 -y 0 -w 0.25 -h 1
./image_compress.sh -i $LEFTFILE -o $LEFTFILE -q $HQUALITY

RIGHTFILE=$FILENAME"_r25.jpg"
./image_split.sh -i $INFILE -o $RIGHTFILE -x 0.75 -y 0 -w 0.25 -h 1
./image_compress.sh -i $RIGHTFILE -o $RIGHTFILE -q $HQUALITY
