#!/bin/bash
# rank-261028-kb5h: attach clip files + rights:set (proposed by showrunner-planet-extremes)
cd /e/clips-viral
C=E:/clips-viral/data/pe-mtn/clips
declare -A F=( [src-261028-76ar]=hook_a [src-261028-d9j9]=end [src-261028-pl8p]=venus [src-261028-ysul]=iapetus [src-261028-og1r]=io [src-261028-p2h7]=vesta [src-261028-4gjc]=hook_b [src-261028-ejx5]=c5 [src-261028-c45o]=c4 [src-261028-mzek]=c3 [src-261028-qgdk]=c2 [src-261028-dc4b]=lead )
for a in "${!F[@]}"; do npm run -s cli -- source:attach-file $a $C/${F[$a]}.mp4 2>&1 | tail -1; done
EV="Primary page checked 2026-10-28 (proposed by showrunner-planet-extremes): the NASA page carries no copyright notice; NASA/JPL mission imagery is generally not copyrighted (NASA media usage guidelines https://www.nasa.gov/nasa-brand-center/images-and-media/). Clip = studio crop/slow push of the still, no overlays. Partner co-credits kept verbatim."
COND=( "Credit as on primary page in description" "No implied NASA endorsement" "Do NOT write 'public domain' for partner/co-credited data; say 'page states no copyright notice'" )
r() { npm run -s cli -- rights:set "$1" approved_with_conditions --actor showrunner-planet-extremes --reason "$2" --evidence "$3" --condition "${COND[0]}" --condition "${COND[1]}" --condition "${COND[2]}" 2>&1 | tail -1; }
for a in 76ar d9j9; do r src-261028-$a "NASA Viking 1 Orbiter Olympus Mons mosaic still, proposed by showrunner-planet-extremes" "https://science.nasa.gov/resource/viking-1-orbiter-image-olympus-mons/ ; credit line: NASA/JPL-Caltech/USGS. $EV"; done
r src-261028-pl8p "NASA/JPL Magellan PIA00149 radar still, proposed by showrunner-planet-extremes" "https://photojournal.jpl.nasa.gov/catalog/PIA00149 ; credit line: NASA/JPL. $EV"
r src-261028-ysul "NASA/JPL Cassini PIA08372 still, proposed by showrunner-planet-extremes" "https://photojournal.jpl.nasa.gov/catalog/PIA08372 ; credit line: NASA/JPL/Space Science Institute. $EV"
r src-261028-og1r "NASA/JPL Galileo PIA03886 still (Mongibello Mons, NOT Boosaule; labelled as such), proposed by showrunner-planet-extremes" "https://photojournal.jpl.nasa.gov/catalog/PIA03886 ; credit line: NASA/JPL/University of Arizona/Arizona State University. Shows Mongibello Mons (7 km), not Boosaule Montes. $EV"
r src-261028-p2h7 "NASA/JPL Dawn PIA15124 still, proposed by showrunner-planet-extremes" "https://photojournal.jpl.nasa.gov/catalog/PIA15124 ; credit line: NASA/JPL-Caltech/UCLA/MPS/DLR/IDA. Right-hand (colour height map) panel only. $EV"
for a in 4gjc ejx5 c45o mzek qgdk dc4b; do
 r src-261028-$a "Original studio graphic (height bars), proposed by showrunner-planet-extremes" "Drawn by scripts/pe-mtn-scale.py with PIL from numbers only (heights: NASA MOLA https://pgda.gsfc.nasa.gov/products/62 ; NASA/JPL https://www.jpl.nasa.gov/images/pia15322-3-d-image-of-the-central-complex-in-vestas-rheasilvia-impact-basin/ ; Schenk et al. https://ntrs.nasa.gov/citations/20030012598 ; Giese et al. 2008 doi:10.1016/j.icarus.2007.06.005 ; NASA/JPL https://photojournal.jpl.nasa.gov/catalog/PIA00149 ; Everest NOAA https://oceanservice.noaa.gov/facts/highestpoint.html). No third-party imagery. Font Cairo Black/Bold, SIL OFL 1.1 (data/brand/quiz-ar/fonts/OFL.txt)."
done
