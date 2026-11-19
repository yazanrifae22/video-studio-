# Channel B: Tech Made Simple (animated explainers)

Research date: **2026-10-20**. I scraped all YouTube numbers on 2026-10-20 from public channel, Shorts, search and watch pages, using the embedded `ytInitialData` and no API key. Channel pages round views ("1.4M"). Search and watch pages give exact counts. "Views/day" is total views divided by days since the publish date, or approximate when only "N months ago" is shown.

---

## 1. Competitors (verified 2026-10-20)

| Channel | Subs / videos | All-time top (popular sort) | Recent performance | Shorts | Source |
|---|---|---|---|---|---|
| **ByteByteGo** (faceless, animated diagrams) | 1.43M / 171 | Kubernetes in 6 Min 1.9M; What Is REST API 1.4M; SSL/TLS/HTTPS 1.3M; Why is Kafka fast 1.2M; Top 6 API Architecture Styles 1.1M; How ChatGPT Works 957K | Mostly 15K–139K. HTTP vs HTTPS 31K (2 mo); How the JVM Works 81K (1 mo); Redis 139K (8 mo) | **Shorts outperform long-form now**: "1 TRILLION messages" 2.4M; "How Big Tech Ships Code" 1.9M; Netflix Tech Stack 1.7M; Why Redis so FAST 1.3M; REST APIs in 30 secs 450K; gRPC, WebSocket and WebHook 360K; GraphQL 232K | https://www.youtube.com/@ByteByteGo/videos , /shorts ; creatordb 1.43M subs on 2026-10-01 https://creatordb.app/creatorstats/bytebytego/ |
| **Fireship** (host voice, fast meme-y edits) | 4.31M / 854 | God-Tier Developer Roadmap 8.4M; Brainf**k in 100 Seconds 7.9M | News commentary at 0.9M–6.2M within days ("Every app on Earth is now open source…" 6.2M in 7 d) | "Why do computers suck at math?" 8.7M; "untold history of web development" 5.2M | https://www.youtube.com/@Fireship/videos |
| **Hussein Nasser** (talking head, deep backend) | 523K / 1K | How to Become a Good Backend Engineer 716K; Proxy vs Reverse Proxy 690K | 12K–234K ("you won't forget how postgres works after this" 234K, 2 mo) | Weak: recent 2.5K–10K; best 76K (Database Partitioning in 60 s) | https://www.youtube.com/@hnasr/videos |
| **NeetCode** | 1.12M / 482 | My Brain after 569 Leetcode Problems 3.4M; 20 System Design Concepts in 10 Min 1.7M; 8 Design Patterns 1.3M | AI-news commentary 29K–168K | Old LeetCode Shorts up to 1.2M; recent AI Shorts 8.7K–52K | https://www.youtube.com/@NeetCode/videos |
| **Hello Interview** | 266K / 131 | Design Ticketmaster 1.1M; Kafka Deep Dive 710K | 29K–285K (Distributed Transactions 285K, 5 mo) | "SQL vs NoSQL is the WRONG Question" 224K; "REST vs GraphQL vs gRPC: Which API wins…" 101K | https://www.youtube.com/@hello_interview/videos |
| **ByteMonk** (faceless, animated) | 405K / 564 | 700 OpenAI Agents… Hugging Face 959K (1 mo); How UPI Works 775K; How Big Tech Checks Your Username in Milliseconds 706K; **OAuth 2.0 explained 413K**; **API Authentication: JWT, OAuth2 390K** | 21K–93K | Weak: 6K–11K | https://www.youtube.com/@ByteMonk/videos |
| **LearnThatStack** (faceless, small, fast-growing) | 112K / **72 videos** | Git Will Finally Make Sense 1.2M; **How LLMs Actually Generate Text 905,453** (published 2025-12-27, ≈3,049/day); Stop Confusing API Gateway, Load Balancer And Reverse Proxy 479K; API Authentication Explained – Basic, Bearer & JWT 336K | 4K–14K on the latest uploads | Weak: 1.8K–9.2K ("Why 'Sign in with Google' ISN'T OAuth" 9.2K) | https://www.youtube.com/@LearnThatStack/videos , https://www.youtube.com/watch?v=NKnZYvZA7w4 |
| **Cloud X Berry** (faceless) | 64.2K / 483 | Linux File Directories 1M (2 mo); **MCP vs API 486K (2 mo)**; Every API Authentication Method 248,786 (published 2026-03-14) | 3.5K–83K, publishing almost daily | Weak: ≤43K | https://www.youtube.com/@TheCloudXBerry/videos |

Faceless system-design Shorts accounts: ByteByteGo's Shorts (above) are the reference case. Hussein Nasser, NeetCode, LearnThatStack, ByteMonk and Cloud X Berry all get weak Shorts views. The only consistent Shorts performers are **ByteByteGo** (animated diagram plus a single "why is X fast/how does Big Tech do X" hook) and **Fireship** (humor). I could not verify a list of smaller dedicated system-design Shorts accounts, because YouTube search with "system design shorts" returned no parseable results. Treat that as **unverified**.

## 2. Topic demand: search results uploaded in the last 12 months, sorted by views (2026-10-20)

| Topic | Top recent results (views, age, length, channel) | Approx views/day of leader | Gap? |
|---|---|---|---|
| How LLMs / AI work | "Anthropic's Chloe Lubinski explains how AI works" 3,033,139 (3 mo); "What is RAG?" 1,110,150 (5 mo, Apna College); "How LLMs Actually Generate Text" 905,453 (9 mo); "How AI Really Works (No Math, Just Logic)" 560,666 (published 2026-01-11, ≈1,988/day) | ~33K/day (Lubinski, approx) | **High demand. Animated beginner versions are rare** |
| Auth: OAuth / JWT / API keys | "7 Authentication Concepts Every Developer Should Know" 822,648 (8 mo, Hayk Simonyan); "Every API Authentication Method Explained" 248,796 (7 mo); "JWT Algorithm Confusion" 124,796 (2 mo) | ~3.4K/day (approx) | Medium-high. Few short, clear animated versions |
| API styles: REST / GraphQL / gRPC | "All Types of APIs in 10 Minutes" 323,101 (2 mo, Gate Smashers); "All Types of APIs Explained in 12 Minutes" 260,843 (4 mo) | ~5.3K/day (approx) | Evergreen. ByteByteGo's versions are 3–4 years old |
| Networking / DNS | "Every Networking Concept Explained In 20 Minutes" 726,281 (10 mo, TechWorld with Nana); "DNS Explained using Wireshark" 414,602 (7 mo, David Bombal) | ~2.4K/day (approx) | Medium. "Every X explained" compilation titles win |
| Caching / system design | freeCodeCamp System Design Course 1,646,027 (6 mo); "Caching in System Design Interviews" 260,624 (11 mo, Hello Interview); "How KV Cache Speeds Up LLMs" 210,845 (3 mo, IBM) | ~9K/day (approx) | **AI-flavored caching (KV, prompt caching) is underserved** |
| Webhooks | "Webhooks for Beginners – From Polling to Real-Time Events" 81,131 (9 mo, Ctrl Alt Explain); "Your REST API Needs Webhooks" 26,448 (4 mo) | ~300/day | **Low competition, modest demand. Good for Shorts and SEO** |
| MCP / agents | "MCP vs API Explained" 486K (2 mo, Cloud X Berry); "How AI agents & Claude skills work" 920,991 (6 mo) | ~8K/day (approx) | **Hot. Simple animated versions are rare** |

URLs follow the pattern `https://www.youtube.com/results?search_query=<topic>&sp=CAMSAggF`. Specific videos: https://www.youtube.com/watch?v=iX8g4LqF8p8 , https://www.youtube.com/watch?v=yib9g0U6VkQ , https://www.youtube.com/watch?v=bXY7899m6M8 , https://www.youtube.com/watch?v=o0gkdZBtwEg , https://www.youtube.com/watch?v=aBUniZHgCnE .

**Conclusions on topics (views/day ranking, approximate):**
1. AI internals (LLMs, RAG, agents, MCP, KV cache) is the highest-demand area and the most current.
2. System design overviews and "every X explained in N minutes" compilations come next.
3. Then auth (OAuth/JWT), API styles, and networking/DNS.
4. Webhooks has the lowest demand but almost no competition.

**Shorts vs long-form:**
- **Long-form** builds search and suggested traffic and earns the higher RPM. AIR 2026: Education & Science median RPM $10.22, Gadgets & Tech $2.33 (https://air.io/en/air-data-findings/which-youtube-niche-makes-the-most-money-in-2026-ranked-by-real-rpm-and-cpm). A "learn backend/AI" framing may be classified closer to Education. That is my inference, **unverified**.
- **Shorts** only work with a single striking diagram plus a "Big Tech scale" hook (ByteByteGo). Most tech creators' Shorts get under 10K views.
- **Plan:** use Shorts for discovery (cut-downs of each long video) and long-form for subscribers and revenue.

**Gaps:**
1. **"Simple" really is underserved.** ByteByteGo targets engineers, and Hussein and Hello Interview are deep. Almost nobody makes 6–9 minute animated explainers for juniors, PMs, no-code builders and students with analogies plus a real diagram.
2. ByteByteGo's evergreen hits (REST, API styles, ChatGPT) are 3–4 years old, so refreshed 2026 versions with AI context have room.
3. Webhooks, idempotency, and OAuth vs OIDC vs "Sign in with Google" get little coverage.
4. AI infrastructure for non-ML devs (tokens, context windows, KV cache, embeddings, agents and tool calling, MCP).

---

## 3. Positioning recommendation

**"Tech Made Simple: the 6-minute animated explainer for people who build with software but didn't study CS."**

- **Audience:** junior devs, bootcamp and CS students, PMs and designers, no-code and AI-automation builders, and interview preppers at the beginner level.
- **Signature format:**
  - One analogy (restaurant, post office, valet key).
  - One real request/response diagram that animates step by step.
  - One "where it breaks" moment.
  - One 10-second recap card.
- **Recurring visual system:** the same characters (Client, Server, Database, Cache) as friendly geometric figures. This creates consistency without becoming templated, because each video's story is different.
- **Avoid:**
  - Template-identical videos, which the inauthentic-content policy targets ("AI-generated content made with generic or unoriginal templates", https://support.google.com/youtube/answer/1311392).
  - Voice that sounds like generic TTS with no editorial voice.
  - Reusing competitors' diagrams. Draw your own.

---

## 4. Growth to the first 1,000 genuine views

1. **Week 1: 2 long-form + 5–7 Shorts.** Each Short is a 30–50 s cut of a long video's best diagram, ending with "full breakdown on the channel". On long-form, use the related-video link field on Shorts.
2. **Titles** follow proven patterns:
   - "X Explained in N Minutes"
   - "Stop Confusing A, B and C"
   - "X Will Finally Make Sense After This"
   - "Why Big Tech Uses X"
   - "Every X Explained"
3. **Thumbnails:** one diagram fragment (two boxes and an arrow), 3–4 words maximum ("JWT ≠ encrypted"), and a high-contrast dark background with one accent color.
4. **Hook (first 5 s):**
   - A concrete surprise ("When you click 'Sign in with Google', the app never sees your password. So what does it get?").
   - Then a promise ("in 6 minutes you'll be able to draw this on a whiteboard").
5. **Genuine distribution** (follow each community's self-promo rules):
   - Answer questions on Reddit (r/learnprogramming, r/webdev, r/node, r/SaaS, r/nocode) and link only when relevant.
   - Post the diagram as an image on LinkedIn and X, and write a dev.to or Hashnode article embedding the video.
   - Submit to newsletters.
   - **Never buy views.**
6. **Cadence:** 2 long-form per week plus 1 Short per day. Refresh titles and thumbnails after 72 h if CTR is under 4% (target, **unverified** benchmark).
7. **Series playlists:** "APIs", "Auth", "System Design Basics", "How AI Actually Works".

## 5. Weighted idea-scoring model

**Score = 0.30·demand + 0.20·competitionGap + 0.20·visualPotential + 0.15·productionEase + 0.15·(6 − policyRisk)**, with every factor 1–5 and policyRisk at 5 = highest risk.
- Tech policy risk is generally low (1–2).
- Raise it to 3 for security topics (exploit how-tos can trip the harmful/dangerous policy), for naming companies with unverified architecture claims, and for news-reaction.

## 6. First-week ideas (14). Full JSON is in `ideas.json`

| # | Title | Format | Dur | Hook |
|---|---|---|---|---|
| 1 | How ChatGPT Writes One Word at a Time (LLMs Explained Simply) | long | 7:30 | "ChatGPT doesn't know its answer when it starts typing. Here's what it's actually doing." |
| 2 | OAuth Explained: Why "Sign in with Google" Never Shows Your Password | long | 6:30 | "You just gave an app access to your Google account without giving it your password. How?" |
| 3 | Webhooks in 45 Seconds: Stop Asking, Get Told | short | 45 s | "Your app checks for new orders 1,000 times a day. 999 of those are wasted." |
| 4 | Your JWT Is Not Encrypted (Anyone Can Read It) | short | 40 s | "Copy your login token, paste it here, and watch your data appear." |
| 5 | REST vs GraphQL vs gRPC – Finally Explained With One Pizza Order | long | 8:00 | "Three ways to order the same pizza. One of them is why Netflix is fast." |
| 6 | What Happens When You Type google.com (DNS Explained Simply) | long | 7:00 | "Before Google loads, your computer asks at least 4 strangers for directions." |
| 7 | Why the Second Load Is Instant: Caching in 50 Seconds | short | 50 s | "The fastest database query is the one you never make." |
| 8 | MCP vs API: Do AI Agents Still Need APIs? | long | 7:00 | "Every AI company suddenly supports MCP. Is it replacing APIs, or wrapping them?" |
| 9 | API Gateway vs Load Balancer vs Reverse Proxy in 60 Seconds | short | 60 s | "Three boxes that sit in front of your server. Most people mix them up." |
| 10 | Rate Limiting: The Token Bucket in 45 Seconds | short | 45 s | "Why you get 'Too Many Requests', explained with a bucket of coins." |
| 11 | How Netflix Streams to Millions Without Melting (System Design, Simply) | long | 9:00 | "Netflix doesn't stream from one place. It streams from a box inside your internet provider." |
| 12 | What Is an AI Agent, Really? It's Just a Loop | short | 55 s | "An AI agent is 4 lines of logic in a loop. Here they are." |
| 13 | KV Cache: The Trick That Makes AI Answer Fast | short | 55 s | "Without this trick, ChatGPT would reread your whole conversation for every word." |
| 14 | API Keys vs OAuth vs JWT: Which One Should You Use? | long | 8:00 | "Pick the wrong one and your API is either annoying or insecure." |
