#!/bin/bash
# Renders the splash in both orientations into ../public. Usage: ./render.sh
set -euo pipefail
cd "$(dirname "$0")"
HF="npx --yes hyperframes@0.9.61"
# portrait cut = same file with the two frame dimensions swapped (layout is in % and --u)
sed -e 's/1920/__W__/g' -e 's/1080/1920/g' -e 's/__W__/1080/g' index.html > portrait.html
trap 'rm -f portrait.html' EXIT
$HF render . -o ../public/splash-landscape.mp4 --crf 24 --skill hyperframes --quiet
$HF render . -c portrait.html -o ../public/splash-portrait.mp4 --crf 24 --skill hyperframes --quiet
# posters = last frame; shown when motion is reduced or autoplay is blocked (e.g. iOS low-power mode)
for o in landscape portrait; do
  ffmpeg -v error -y -sseof -0.1 -i ../public/splash-$o.mp4 -frames:v 1 -vf "scale=iw*2/3:-2" -q:v 5 ../public/splash-$o.jpg
done
ls -la ../public/splash-*
