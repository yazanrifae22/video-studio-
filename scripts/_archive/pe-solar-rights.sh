#!/bin/bash
# rank-261028-942s: attach clip files + rights:set (proposed by showrunner-planet-extremes)
cd /e/clips-viral
C=E:/clips-viral/data/pe-solar/clips
declare -A F=( [fcpy]=hook_a [ysmi]=hook_b [q4b8]=v1 [trmr]=end [54mf]=j1 [p0ig]=j2 [zism]=m1 [8yk0]=m2 [282p]=e1 [j42l]=e2 [04j7]=me1 [ovmc]=me2 )
declare -A U=( [hook_a]="https://science.nasa.gov/photojournal/venus-3-d-perspective-view-of-maat-mons-2/ ; credit NASA/JPL (PIA00254)" [end]="https://science.nasa.gov/photojournal/venus-3-d-perspective-view-of-maat-mons-2/ ; credit NASA/JPL (PIA00254)"
 [hook_b]="https://science.nasa.gov/photojournal/venus-3-d-perspective-view-of-maat-mons/ ; credit NASA/JPL (PIA00106)" [v1]="https://science.nasa.gov/photojournal/venus-3-d-perspective-view-of-maat-mons/ ; credit NASA/JPL (PIA00106)"
 [j1]="https://science.nasa.gov/photojournal/cassini-jupiter-portrait/ ; credit NASA/JPL/Space Science Institute (PIA04866)" [j2]="https://science.nasa.gov/photojournal/cassini-jupiter-portrait/ ; credit NASA/JPL/Space Science Institute (PIA04866)"
 [m1]="https://science.nasa.gov/photojournal/curiositys-selfie-at-the-mary-anning-location-on-mars/ ; credit NASA/JPL-Caltech/MSSS (PIA24173)" [m2]="https://science.nasa.gov/photojournal/curiositys-selfie-at-the-mary-anning-location-on-mars/ ; credit NASA/JPL-Caltech/MSSS (PIA24173)"
 [e1]="https://www.nasa.gov/image-article/blue-marble-view-from-apollo-17/ ; credit NASA (AS17-148-22727)" [e2]="https://www.nasa.gov/image-article/blue-marble-view-from-apollo-17/ ; credit NASA (AS17-148-22727)"
 [me1]="https://science.nasa.gov/photojournal/rachmaninoff-in-concert-with-recently-named-craters-on-mercury/ ; credit NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington (PIA12998)" [me2]="https://science.nasa.gov/photojournal/rachmaninoff-in-concert-with-recently-named-craters-on-mercury/ ; credit NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington (PIA12998)" )
COND=( "Credit as on the primary page in the description" "No implied NASA/JPL/APL endorsement" "Venus images are labelled as Magellan radar data rendered in 3-D (simulated colour), not photographs" )
for k in "${!F[@]}"; do
 a=src-261028-$k; n=${F[$k]}
 npm run -s cli -- source:attach-file $a $C/$n.mp4 2>&1 | tail -1
 npm run -s cli -- rights:set $a approved_with_conditions --actor showrunner-planet-extremes --reason "NASA/JPL Photojournal / NASA image (US-government work, no copyright notice on page), proposed by showrunner-planet-extremes" \
  --evidence "Primary page checked 2026-10-28: ${U[$n]}. The page states no copyright notice; NASA-created imagery under NASA media usage guidelines https://www.nasa.gov/nasa-brand-center/images-and-media/ (write 'page states no copyright notice', not 'public domain', for partner credit lines SSI/MSSS/APL). Clip = studio crop/slow push of the still, no overlays." \
  --condition "${COND[0]}" --condition "${COND[1]}" --condition "${COND[2]}" 2>&1 | tail -1
done
