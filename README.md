# Harshada & Sohan – wedding invitation (Netlify)

## What is in this folder
- `public/index.html` – the invitation (change the date, venue link and names near the top of the `<script>`, in `CFG`)
- `public/img/` – the card artwork
- `netlify/functions/blessings.mjs` – the shared blessings wall (stored in Netlify Blobs, nothing else to set up)
- `netlify/lib/wall.mjs` – the rules for posting and deleting

## Deploy
The wall needs the function, so do NOT drag-and-drop only the `public` folder.

**Option A – GitHub (no tools needed)**
1. Put this whole folder in a new GitHub repository.
2. In Netlify: Add new site, Import an existing project, choose the repository. Settings come from `netlify.toml`.
3. Deploy, then share the `https://...netlify.app` link.

**Option B – Netlify CLI**
```
npm install
npm install -g netlify-cli
netlify login
netlify deploy --prod
```
(publish directory: `public`)

## How the wall behaves
- Anyone with the link can post. No sign-in, no accounts.
- Everyone sees the same wall: the 10 newest notes, newest on top. When an 11th arrives the oldest one drops off the list. The wall refreshes by itself every 15 seconds.
- Up to 100 notes are kept behind the scenes; beyond that the oldest are removed.
- When someone posts, their browser keeps a private delete key for that note. Only that browser shows a Delete button for it, and the server refuses a delete without the key. Fix a spelling mistake by deleting and posting again.
- If someone clears their browser data or switches phone, they can no longer delete their old notes.

## Moderating as the owner (optional)
Netlify, Site configuration, Environment variables: add `ADMIN_KEY` with a long secret, then redeploy.
Open `https://your-site.netlify.app/?admin=YOUR_SECRET` once and every note shows a Delete button in that tab.
