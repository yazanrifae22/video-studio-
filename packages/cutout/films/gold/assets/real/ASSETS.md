# Gold film: real-media assets (2026-11-19)

Use in film code: `F.photo('<name>', {slot, caption, at, out})` (credit string `cr_<name>` is added automatically) and `F.tv('<clip>', {slot, at, t0, out, loop})`
(credit label `cr_clip_<clip>` on the TV chin). Strings live in `docs/brands/karto/gold/strings.d/credits.json` + `captions.json`. Source details: `sources.json`.
Photos are 1920 px wide, free licence (Wikimedia Commons) or public domain. Clips are third-party TikTok footage (Video Hunter, owner order, `official: false`, claim risk).
Frame folders: `assets/real/<clip>/0001.jpg...` + `index.json {count, fps: 15}`, 480 px wide, no audio, no burned-in text (checked on frames).

## Clips (10 usable)
| clip | frames/size | shows | uploader | views | lines it fits | wishlist key it replaces |
|---|---|---|---|---|---|---|
| `bars_hands` | 90 (6 s) 480x854 | gloved hands unpacking gold bars from foam trays | richard_belgium | 3.0 M | l096, l093 (refinery), any "real bars" beat | `real/pour` (alt), `real/refinery.jpg` |
| `pour` | 90 (6 s) 480x854 | gold melting in a glowing crucible furnace | amanetags | 1.9 M | l093 | `real/pour` |
| `pour_b` | 105 (7 s) 480x854 | gold melted over a furnace flame, workshop | clairamor | 105 K | l093 (2nd cut), refinery beats | `real/pour`, `real/ingots_conveyor.jpg` |
| `souk_clip` | 90 (6 s) 480x854 | walk down a Dubai Gold Souk lane, shop windows, shoppers | whattariwears | 646 K | l005-l006, l020, l026-l027 | `real/souk_clip`, `real/souk_crowd` |
| `souk_bangles` | 76 (5 s) 480x854 | hand trying gold bangles at a souk counter, then tassel earrings | iconiccpinkk | 2.2 M | l028-l029, l066-l067 (wedding gold) | `real/jeweller_shop.jpg`, `real/bracelets.jpg` |
| `shop_counter` | 41 (2.7 s) 480x854 | glass wall of gold chains and pendants | itstheuddins | 464 K | l028 (short cut-in) | `real/gold_jewelry_market.jpg` |
| `jeweller_chains` | 60 (4 s) 480x700 | jeweller holding bundles of gold chains (top 18 % cropped) | mamunhaq54 | 71 K | l028-l030 | `real/jeweller_shop.jpg` |
| `wedding_hand` | 68 (4.5 s) 480x854 | hand holding heavy wedding gold pieces | neghabs | 145 K | l066-l067 | `real/wedding_gold.jpg`, `real/bracelets.jpg` |
| `coin_bracelet` | 90 (6 s) 480x666 | gold coin bracelet held over a jeweller scale (top 22 % cropped) | aboyossf29 | 600 K | l031 (weighing), l066 | `real/gold_scale.jpg` |
| `shop_crowd` | 75 (5 s) 480x630 | crowded gold shop floor, then trays of gold bangles (top 26 % cropped) | noni_70 | 242 K | l014 (used in c01), l027 | `real/buy_queue`, `real/souk_crowd` |

Rejected: hunt 15 souk walk (burned-in "DUBAI GOLD SOUK" caption in the usable windows), hunt 23 display (burned-in "Deria dubai" tag and weight captions all through),
hunt2 04 dealer counter (private faces + a phone gold calculator showing an old price per ounce), hunt2 12 coin bracelets (burned-in price overlays).
No clip exists for: a price board, a trading floor in motion, a queue to SELL gold, news screens (use the photos / cardboard models).

## Photos (credit key `cr_<name>`; PD = public domain)
| file | shows | licence / credit text | lines | wishlist key it replaces |
|---|---|---|---|---|
| `bars_vault` | rows of 400 oz gold bars | CC BY-SA, Andrzej Barabasz | l001-l002, l096 | `bars_vault.jpg` |
| `bars_stack` | pile of gold ingots, white background | PD, Szaaman | l010-l013 | `bars_stack.jpg` |
| `cb_vault` | OLD (c. 1935) photo of a vault with gold bars | PD, US National Archives. Caption it "old photo", never "today's" vault | l003-l004, l081-l082 | `cb_vault.jpg` |
| `ny_fed_building` | the NY Fed BUILDING (not the vault) | CC BY-SA, Ken Lund | l017-l019 | `ny_fed_vault.jpg` (label as building: `cap_ny_fed`) |
| `souk_windows` | Dubai Gold Souk shop windows | CC BY, Rob Young | l020 | `souk_windows.jpg` |
| `souk_gate` | Gold Souk gate | CC BY-SA, Saaremees | l020, l026 | spare |
| `jeweller_shop` | gold shop, Al-Hamidiyah Souq, Damascus | CC BY-SA, Leon petrosyan | l028-l029 | `jeweller_shop.jpg`, `gold_jewelry_market.jpg` |
| `gold_scale` | 1840-60 portable gold scale (museum) | CC BY-SA, Cullen328 | l031 | `gold_scale.jpg` |
| `dubai_skyline` | Dubai skyline, Burj Khalifa | CC BY, Tim Reckmann | l026 | `dubai_skyline.jpg` |
| `fed_building` | Eccles Building, Federal Reserve Board | PD, Federal Reserve | l037 | `fed_building.jpg` |
| `warsh` | Kevin Warsh official photo | PD, The White House | l021-l022 | `warsh.jpg` |
| `dollar_bill` | US dollar bill | CC BY, Andrew Magill | l038-l039, l047-l048 | `dollar_bill.jpg` |
| `trading_floor` | NYSE floor (colour) | PD, Carol M. Highsmith / Library of Congress | l023, l040, l087 | `screens_red`, `analyst_desk.jpg` |
| `trading_floor_bw` | older black-and-white NYSE floor (no year on the label) | PD, Thomas J. O'Halloran / Library of Congress | l070-l074 (the past) | `news1980.jpg` (stand-in) |
| `shelf_prices` | e-ink supermarket price tags | CC BY-SA, Maksym Kozlenko | l035-l036 | `shelf_prices.jpg` |
| `gold_bar_hand` | hand lifting a real bar, Bank of England Museum | CC BY, Matt Brown | l046, l051-l052 | `gold_bar_hand.jpg` |
| `bond` | US $100 savings bond | PD, US Treasury | piece four (a government bond) | `treasury_yield_screen.jpg` (stand-in) |
| `india_loan_sign` | Muthoot Finance branch sign | CC BY-SA, Albert_Deccan | l057-l058 | `india_loan_sign.jpg` |
| `bracelets` | four gold bangles | CC BY-SA, Bhaskaranaidu | l066-l067 | `bracelets.jpg` |
| `wedding_gold` / `wedding_box` | bridal gold jewellery | CC BY-SA, S. Siddula / S. S. Islam | l066-l067 | `wedding_gold.jpg` |
| `pawn_sign` | Hatton Garden gold-buying sign | CC BY, Matt Brown | l057 | `pawn_sign.jpg` |
| `oil_rig` | oil pump | CC BY-SA, Gulustan | oil/inflation beats | `oil_rig.jpg` |
| `nbp_building` | Polish central bank, Warsaw | CC BY-SA, Adrian Grycuk | l083 | `nbp_building.jpg` |
| `pboc`, `treasury`, `goldman`, `fort_knox` | PBoC HQ, US Treasury, 200 West St, Fort Knox sign | CC BY-SA (Max12Max, Wisneyykarin, Potro, Chris Light) | piece three / seven | spare |
| `mine`, `miners_old`, `bars_worker_bw` | open-pit mine, old mine photo, bar stamping (b/w) | CC BY-SA / CC BY | l091-l092 | `mine.jpg`, `miners.jpg` |
| `seven_storey` | seven-storey building | CC BY-SA, Thomas1313 | cube-for-scale beat | `seven_storey.jpg` |
| `gold_coins`, `krugerrand`, `nugget`, `bar_stamps`, `boe_bars`, `souk_windows` | coins, nugget, bar stamps, Swiss bars | CC0 / CC BY / CC BY-SA | l091-l096 | `gold_coins.jpg`, `lbma_bar_stamp.jpg` |

No photo exists (draw cardboard instead): `news1980`, `news2013`, `price_board` (use `F.priceBoard`, `F.newspaper`), `hormuz`, `treasury_yield_screen`, `phone_gold_app`, `hanoi_queue`, `refinery`.
