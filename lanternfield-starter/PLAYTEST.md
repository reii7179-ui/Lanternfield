# Putting the playtest on itch.io

Friends play in their browser, on a phone or a computer. When they're ready, they press **Copy the record** and send you
what it copied. You paste the records into a file, and one command sums them up.

## 1. Make the files
```bash
npm run package:itch
```
That writes, in `dist/`:
- `lanternfield-playtest-<version>-<hash>.zip`: the game, ready to upload. It holds one file, `index.html`, at the top
  of the zip, which is where itch.io looks for it.
- `itch/index.html`: the same game, unzipped, if you want to try it first. Double-click it.

The playtest build is the normal game plus a short note on the title screen telling testers how to send their record.

For the page's pictures (a cover and four screenshots taken from the game, in `dist/itch/`):
```bash
npm run package:itch-images
```

## 2. Create the page on itch.io
Sign in, open your **Dashboard** and choose **Create new project**. itch.io moves its settings around now and then. If
a name below doesn't match exactly, pick the closest one.

| Setting | Choose |
|---|---|
| Title | Keep Lanternfield Lit |
| Project URL | anything, e.g. `keep-lanternfield-lit` |
| Short description or tagline | Twelve rides, one crew, and the clock never waits. |
| Classification | Games |
| Kind of project | **HTML** (the game is played in the browser) |
| Release status | Prototype (or In development) |
| Pricing | No payments |
| Uploads | **Upload files** → the zip. Then tick **This file will be played in the browser**. |
| Embed options | Embed in page |
| Viewport dimensions | **1280 × 720** |
| Frame options | tick **Mobile friendly** (orientation: Default), **Fullscreen button** |
| | leave **Automatically start on page load** and **Enable scrollbars** unticked |
| Cover image | `dist/itch/cover.png` |
| Screenshots | `dist/itch/shot-*.png` |
| Genre | Simulation |
| Tags | management, real-time, strategy, singleplayer |
| Visibility & access | **Restricted**, so only people you invite can open the page (see below) |

itch.io also has an **AI generation disclosure** section. Answer it for your project as you see fit.

**Keeping it to your friends.** With **Restricted**, itch.io offers ways to let particular people in, such as a page
password or invited accounts. A password is the easiest: you send the link and the password together. If you'd rather
not bother, **Public** is fine too. A new page with no tags or promotion gets very few visitors.

Press **Save**, then **View page**. Play a minute on your computer and on your phone, and try **Copy the record**
(How to play → bottom of the dialog) before you send the link round.

## 3. Page text (ready to paste into Description)
> **Keep Lanternfield Lit** is a real-time maintenance game set in a seaside funfair. Twelve rides, a maintenance
> company and its whole chain of command, from the technician with the spanner to the chief executive. Pick a seat
> and keep the park running for a fourteen-day season.
>
> - A day lasts about five minutes. Pause any time (P or the Pause button).
> - Works on a phone or a computer. Use the fullscreen button on a phone.
> - Sound is off to start with. Turn it on with the **Sound** button, or in How to play.
> - Everything is kept in your browser on this device: close the page and carry on later.
>
> **This is a playtest.** Play as long as you like. Then open **How to play** (the **?** button at the top), press
> **Copy the record** and send it to me. It's a few numbers about how quickly you reacted, nothing personal. A record
> after a day or two is just as useful as one from a whole season.

## 4. What to send your testers
> Here's the game I've been making: <link> (password: <password>). It runs in the browser, phone or computer. When
> you've had a go, open How to play (the ? button), press Copy the record at the bottom and paste it to me in a
> message. Thanks!

## 5. Reading the records
Paste each record into one text file, e.g. `records.txt`, in any order. Who it came from and the rest of the message
can stay around it. Then:
```bash
npm run records -- records.txt
```
You get one line per tester and a summary for each build:
- **react:** seconds from a breakdown to their order;
- **fast %:** how often they were inside the fast-response window;
- **answer:** seconds to answer a request;
- **days:** finished days. `3+` means three days plus part of the fourth.

The device column shows the screen size, touch or not, and their motion and sound settings.

**Which build?** Every record starts with a stamp like `0.4.0+9bf0f197`: the version in `package.json` plus a short
code that changes whenever the game's files change. If you upload a new build, records from the old and the new one
are summed up separately. To give a build a friendlier name, raise `version` in `package.json` before packaging.

## Uploading a new build
1. Run `npm run package:itch` again.
2. On the itch.io page, open **Edit game**. Under **Uploads**, delete the old zip, upload the new one and tick **This
   file will be played in the browser** again.
3. Save.

Testers' saves carry on: the game keeps them in the browser, not in the zip.

## Good to know
- **What the record holds:**
  - the build stamp;
  - difficulty, seat, finished days, and the grade once the season is over;
  - each day's counts and median times;
  - screen size, touch or not, and the motion and sound settings.
  
  It holds no name, address or account. The game sends nothing anywhere: a record reaches you only if a tester copies
  and sends it. itch.io itself shows you views and plays, under its own privacy policy.
- **Saves live in the tester's browser.** If they use a private window, clear their browsing data, or switch device,
  they start again. iPhones and iPads are the most likely to drop a save in a page they haven't opened for a while. If
  that happens, their record so far goes with it, so ask phone testers to copy their record whenever they stop.
- **Copy the record** works inside itch.io's page (the test suite checks it in a frame on another site). If a browser
  still refuses, the record is left selected and the game says so. Testers can copy it by hand: Ctrl+C, Cmd+C or a
  long press.
- **No sound on an iPhone?** The ring/silent switch mutes browser games too.
- **Offline:** the zip holds everything (fonts, art and sound are all inside the one file), so nothing else is fetched
  while people play.
