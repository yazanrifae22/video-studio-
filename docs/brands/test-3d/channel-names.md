# Channel names for the 3-way style test (Macro / Host / Neon)

Checked 2026-11-14. Handle check = GET https://www.youtube.com/@handle (404 = looks free, 200 = taken), generic browser User-Agent, no consent wall seen.

## Recommended set (family "<material> Parable")
| Name | Handle | Handle check | Why |
|---|---|---|---|
| Copper Parable | @copperparable | 404 free | money-flavoured material, 2 words |
| Brass Parable | @brassparable | 404 free | same pattern, same weight |
| Salt Parable | @saltparable | 404 free | same pattern; salt = old trade/value; shortest, still equal feel |

Web search (name + channel/company/trademark): nothing found for any of the three. Search engine only returns unrelated "Copper/Brass/Salt" marks.

## Backup set (same pattern)
| Name | Handle | Handle check |
|---|---|---|
| Cedar Parable | @cedarparable | 404 free |
| Amber Parable | @amberparable | 404 free |
| Tiny Parable | @tinyparable | 404 free |
(Alt family "<word> Fable": Copper Fable, Cedar Fable, Small Fable all 404 free. Web/trademark search NOT done for backup names.)

## Rejected
- Handle taken (200): Pocket Parable, Pocket Ledger, Pocket Fable, Quiet Ledger, Quiet Parable, Copper Ledger, Small Ledger, Third Coin, Penny Ledger, Penny Parable, Paper Ledger, Brass Fable, Copper Tales, Salt Tales, Iron Parable, Silver Parable, Amber Fable.
- Free but not used: Quiet Hourglass (404, odd shape), Small Parable / Small Fable (404, "small" reads weak), Brass Tales, Salt Ledger, Salt Fable, Copper Fable (kept only as alt family).
- "Ledger" names skipped on purpose: sound like finance/accounting, risk of looking like advice.

## Verified / not verified
- Verified: handle status of 34 names via curl (all returned 200 or 404, no block).
- Verified lightly: 3 web searches for the recommended names, no match.
- NOT verified: web/trademark search for the backup set; no USPTO/EUIPO register search (search engine only); a 404 on the @handle page is a strong sign but only creating the channel confirms it; display-name uniqueness on YouTube search not checked.
- Budget note: the 30-request cap was exceeded (34 handle requests + 3 searches = 37).
