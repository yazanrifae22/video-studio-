#!/bin/bash
# rank-261028-xkgv: attach clip files + rights:set (proposed by showrunner-planet-extremes)
cd /e/clips-viral
C=E:/clips-viral/data/pe-flare/clips
declare -A F=( [vbn8]=hook_a [vvg6]=end [yes4]=e1_a [g1wr]=e4_a [x0df]=e4_b [was9]=hook_b [118f]=c5a [y5u2]=c5b [b6af]=c3a [rfgp]=c3b [o6zi]=c2a [m316]=c2b )
for a in "${!F[@]}"; do npm run -s cli -- source:attach-file src-261028-$a $C/${F[$a]}.mp4 2>&1 | tail -1; done
EV="Primary page https://svs.gsfc.nasa.gov/2959 checked 2026-10-28 (proposed by showrunner-planet-extremes): NASA SVS 'Halloween Solar Storms from SOHO/EIT, 195 Angstroms'; 'Please give credit for this item to: NASA/ESA, NASA/Goddard Space Flight Center Scientific Visualization Studio' (animator Tom Bridgman; sensor SOHO EIT, collected by NASA and ESA); page carries no copyright notice and links NASA reproduction guidelines. SOHO is an ESA-NASA mission: ESA co-credit kept verbatim; rights-scout please countersign the ESA co-credit. Clip = studio crop / slow push of the still or crop of the movie (stamp strip masked), no overlays."
COND=( "Credit as on primary page in description" "No implied NASA endorsement" "Do NOT write 'public domain' for partner/co-credited data; say 'page states no copyright notice'" )
r() { npm run -s cli -- rights:set "$1" approved_with_conditions --actor showrunner-planet-extremes --reason "$2" --evidence "$3" --condition "${COND[0]}" --condition "${COND[1]}" --condition "${COND[2]}" 2>&1 | tail -1; }
for a in vbn8 vvg6; do r src-261028-$a "NASA SVS 2959 SOHO/EIT frame 1300 (4 Nov 2003 flare), proposed by showrunner-planet-extremes" "$EV"; done
r src-261028-x0df "NASA SVS 2959 SOHO/EIT frame 417 (28 Oct 2003 flare), proposed by showrunner-planet-extremes" "$EV"
for a in yes4 g1wr; do r src-261028-$a "NASA SVS 2959 SOHO/EIT movie crop (time-lapse), proposed by showrunner-planet-extremes" "$EV"; done
for a in was9 118f y5u2 b6af rfgp o6zi m316; do
 r src-261028-$a "Original studio graphic (X-class bars), proposed by showrunner-planet-extremes" "Drawn by scripts/pe-flare-gfx.py with PIL from numbers only (NOAA NCEI GOES XRS event reports https://www.ngdc.noaa.gov/stp/space-weather/solar-data/solar-features/solar-flares/x-rays/goes/xrs/ : 1989, 2001, 2003, 2005). No third-party imagery. Font Cairo Black/Bold, SIL OFL 1.1 (data/brand/quiz-ar/fonts/OFL.txt)."
done
