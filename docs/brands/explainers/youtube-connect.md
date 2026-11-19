# Connect the studio to YouTube (owner, one time)

Only the owner can do steps 1–3: they create accounts, accept Google's terms and sign in. The studio never sees your password. It only stores a revocable refresh token in `data/tokens/` (git-ignored).

## 1. Create the three channels (about 10 minutes)
Use one Google account. Each channel is a **Brand Account**, so you can add managers later without sharing a password.
1. Go to youtube.com, then **profile picture → Settings → Add or manage your channel(s) → Create a channel**. Do this 3 times.
2. For each channel, open **YouTube Studio → Customization** and fill it in from that channel's kit:
   - [Tech](../channels/tech/brand/channel-kit.md)
   - [Celebrity](../channels/celebrity/brand/channel-kit.md)
   - [Kids](../channels/kids/brand/channel-kit.md)

   Each kit gives the name, handle, description and keywords. The kit also says where to upload `avatar.png`, `banner.png` and `watermark.png`.
3. **Kids channel only:** go to **Studio → Settings → Channel → Advanced settings** and choose **"Yes, set this channel as made for kids."**
4. **Every channel:** turn on **phone verification** at youtube.com/verify. Without it, YouTube blocks custom thumbnails and videos longer than 15 minutes.

## 2. Create the Google Cloud OAuth client (about 10 minutes, free)
1. Open console.cloud.google.com and create a project named `video-studio`.
2. Go to **APIs & Services → Library** and enable **YouTube Data API v3** and **YouTube Analytics API**.
3. Set up **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - **User type:** External.
   - **App name:** "Video Studio". Add your email as the support and contact email.
   - **Audience → Test users:** add your Google account.
   - Set the **Publishing status** to **In production**. Google won't verify the app, which is fine for personal use. You'll see an "unverified app" warning when you sign in, which is expected. In **Testing** mode the sign-in expires every 7 days.
4. Go to **Clients → Create client** and pick the type **Desktop app**, named `studio-cli`. Download the JSON file.
5. Save the file as `config/youtube-oauth-client.json` in this folder. It is git-ignored, so don't paste its contents anywhere.

## 3. Authorize each channel
```
npm run cli -- youtube:status            # clientConfigured: true
npm run cli -- youtube:auth tech         # opens a Google URL → pick "Tech Made Simple"
npm run cli -- youtube:auth celebrity    # pick "The Moment"
npm run cli -- youtube:auth kids         # pick "Tiko & Pip"
npm run cli -- youtube:status            # all three: authorized, with their YouTube channel ids
```
On the screen that asks you to choose an account, choose the **brand channel**, not your personal profile.

## 4. Approve, then upload and schedule
1. **Approve** each video in the studio (http://127.0.0.1:4310 → Review). Nothing uploads without your approval.
2. **Test with one video first:**
   ```
   npm run cli -- youtube:upload <videoId>
   ```
   This uploads it as a private draft. Open it in YouTube Studio and check the title, description, thumbnail, captions and the "altered or synthetic content" setting.
3. **Allow scheduling** for each channel you want auto-published. This is your explicit opt-in, so the command has to say it's you:
   ```
   npm run cli -- youtube:authorize-publishing tech --i-am-the-owner
   ```
4. **Upload the rest**, each video set to go public at its calendar slot:
   ```
   npm run cli -- youtube:upload-all tech --schedule --dry-run
   ```
   Run that once to preview the list, then run the same command again without `--dry-run`.
5. **If the Oct 21 slots have already passed by then**, move the calendar forward first:
   ```
   npm run cli -- schedule:shift all --start <ISO time> --dry-run
   ```
   It warns you about any deadline the move would break.

### Important: Google's "unverified app" upload lock
Google locks videos uploaded through the API by an **unaudited** Cloud project (any project created after July 2020) to **private**. So uploads will arrive as private drafts, and setting them to public or scheduled may not work until the project passes Google's free **YouTube API compliance audit**. The audit is a form in the Cloud console and usually takes a few weeks.

What to do meanwhile:
- Do the step-4 test upload. If YouTube Studio lets you set that video to *Scheduled*, the API route works for you.
- If it says the video is locked, use the manual fallback:
  ```
  npm run cli -- youtube:kit <channel>
  ```
  This writes one folder per video to `exports/<channel>/`, each with the video, thumbnail, captions and a `metadata.txt` (title, description, tags, Made for Kids setting, publish time). Upload each folder in YouTube Studio with **Upload → Schedule**. It takes about 2 minutes per video.
- Submit the audit form so later weeks can run fully through the API.

### Quota
The free YouTube Data API quota is 10,000 units per day per project. Google publishes conflicting costs for one upload: some versions of the docs say 100 units, older ones say 1,600. At 1,600 units, uploading all 42 videos takes several days, so upload each channel's next 2–3 days first. `youtube:upload-all` stops cleanly when the quota runs out, and you can run it again the next day.
