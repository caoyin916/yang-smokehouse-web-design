#!/usr/bin/env bash
# Builds responsive WebP images into src/assets/img from the downloaded originals in .work/.
# Usage: bash scripts/process_images.sh   (needs ffmpeg with libwebp, python)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=src/assets/img
mkdir -p "$OUT/menu" "$OUT/brand"

webp() { # src dest width quality
  ffmpeg -loglevel error -y -i "$1" -vf "scale='min($3,iw)':-2:flags=lanczos" -c:v libwebp -quality "${4:-78}" -compression_level 6 "$2"
}

# Dish photos: <slug>-640.webp and <slug>-1200.webp
python -I -X utf8 -c "import json;[print(k,v) for k,v in json.load(open('.work/image-jobs.json')).items()]" | tr -d '\r' |
while read -r slug id; do
  [ -f "$OUT/menu/$slug-1200.webp" ] && continue
  webp ".work/raw/$id.img" "$OUT/menu/$slug-640.webp" 640
  webp ".work/raw/$id.img" "$OUT/menu/$slug-1200.webp" 1200
done

W=.work/wix; G=.work/gbp
webp "$W/76facf_3955ff8d3e96428a9917db9c9544b3d1~mv2.png" "$OUT/brand/skewers-on-the-grill-900.webp" 900 80
webp "$W/76facf_3955ff8d3e96428a9917db9c9544b3d1~mv2.png" "$OUT/brand/skewers-on-the-grill-1500.webp" 1500 80
webp "$W/76facf_b1662a226c8049a78290c68a19c7c686~mv2.png" "$OUT/brand/grandma-yang-and-family-900.webp" 900 80
webp "$W/76facf_b1662a226c8049a78290c68a19c7c686~mv2.png" "$OUT/brand/grandma-yang-and-family-1800.webp" 1800 80
webp "$W/70a68f_fcf914c2f3e54c60a22428200e564e13~mv2.png" "$OUT/brand/crispy-tofu-balls-900.webp" 900 80
webp "$W/70a68f_519fa72d0dba4237bc42f1c7fd4c0907~mv2.png" "$OUT/brand/glazed-wings-900.webp" 900 80
# crop=…: removes the printer's production notes above the coupon
ffmpeg -loglevel error -y -i "$W/70a68f_dd8c10571b7644d18bc698873ea2e7b7~mv2.png" -vf "crop=iw:ih-86:0:86" -c:v libwebp -quality 82 "$OUT/brand/heb-coupon-1000.webp"
webp "$G/g00.jpg" "$OUT/brand/storefront-1400.webp" 1400 80
webp "$G/g00.jpg" "$OUT/brand/storefront-800.webp" 800 80
webp "$G/g01.jpg" "$OUT/brand/dining-room-1400.webp" 1400 80
webp "$G/g01.jpg" "$OUT/brand/dining-room-800.webp" 800 80
webp "$G/g02.jpg" "$OUT/brand/exterior-legacy-dr-1200.webp" 1200 78
# Logos
cp "$W/76facf_34742d7e944c450394c94e3f205463c3~mv2.png" "$OUT/brand/yangs-smokehouse-logo.png"
ffmpeg -loglevel error -y -i "$W/76facf_8b73618cbdc24c85b769cfa1ccbc1be3~mv2.png" -vf "scale=1000:1000" "$OUT/brand/yang-mark-1000.png"
echo "done: $(ls $OUT/menu | wc -l) menu files, $(ls $OUT/brand | wc -l) brand files, $(du -sh $OUT | cut -f1)"
