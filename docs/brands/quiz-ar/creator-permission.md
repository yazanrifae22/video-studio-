# Suyog Mahat — reuse permission & footage intake

Status (2026-10-22): owner is requesting permission. Until written permission exists, all `fb-*` sources stay
`research_only` and no reel is downloaded.

## Message the owner can send (English — edit freely)
> Hi Suyog, I run «شو شايف؟» (@shoshayef), a new Arabic-language channel of visual puzzles and brain teasers.
> I really like your intuition-test reels. Would you allow us to download your reels and use them as reference
> material and, where useful, adapt clips of them into Arabic versions with Arabic narration and our own branding?
> We would credit you in every description ("Original by Suyog Mahat — facebook.com/SuyogMahat") and can share
> each video with you before posting. Please let me know the terms you'd like (credit wording, platforms,
> anything you don't want used). Thank you!

Get the answer **in writing** (Messenger/email screenshot is fine) and make sure it says which uses are allowed:
reference only, or reuse of footage in our videos; which platforms; credit wording; monetised channels OK?

## Intake once permission is granted
1. Save the permission proof to `data/rights/suyog-mahat/` (screenshot or exported message, dated).
2. Footage the owner hands over: put the files in `data/media/suyog-mahat/` (one file per reel, name = reel id).
   Or, if the permission covers it, Claude downloads them via FDOWN in Chrome per the original brief.
3. For each reel: `npm run -s cli -- source:attach-file fb-<id> <path>` then
   `rights:set fb-<id> approved_with_conditions --reason "Written permission from Suyog Mahat <date>" --evidence "data/rights/suyog-mahat/<file>" --condition "<credit wording>" --condition "<platforms/limits>" --actor rights-scout`.
4. rights-scout countersigns against the exact permission wording before any reel is used in a production.
5. Every video using them carries the agreed credit unchanged.
