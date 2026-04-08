<<<<<<< HEAD
# 🗓️ Wall Calendar

Hey! Welcome to the Wall Calendar project. This is an interactive calendar you can use right in your browser — no sign-up, no backend, nothing to install except the project itself.

It looks and feels like a real physical wall calendar, but with smooth animations, theme switching, dark mode, and a notes section built right in.

---

## What can it do?

Here's a quick rundown of everything packed into this one component:

**Pick a date range**
Click any date to set your start. Click another to set your end. The days in between light up automatically. Hover over dates before clicking to preview your selection.

**Write notes**
There are two note areas — one for the whole month, and one that attaches to whatever date range you've selected. Both save automatically to your browser so they're still there when you come back.

**Switch themes**
Three themes to choose from — Alpine (blue), Coast (teal), and Sunset (orange). Each one changes the background, colors, and the floating dots in the background.

**Dark mode**
Hit the toggle in the top right. A circle sweeps across the screen as it switches — it's a small detail but it feels nice.

**Holiday markers**
Indian public holidays show up as a small pulsing red dot on the calendar. Hover over the date to see the name.

---

## Getting it running

You'll need Node.js installed. Then:

```bash
# 1. Clone the project
git clone <your-repo-url>
cd calender

# 2. Install packages
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you're good to go.

---

## How the project is organized

```
calender/
├── public/
│   └── hero.svg          ← the image at the top of the calendar
├── src/
│   └── app/
│       ├── page.tsx      ← everything lives here (calendar, notes, themes)
│       ├── layout.tsx    ← sets up fonts and the page wrapper
│       └── globals.css   ← all the colors, themes, and animations
└── package.json
```

It's intentionally kept simple — one page, one CSS file, no extra folders.

---

## Tech used

- **Next.js 16** — the React framework
- **React 19** — for building the UI
- **TypeScript** — keeps the code predictable
- **Tailwind CSS v4** — for styling
- **Fraunces** — the serif heading font
- **Space Grotesk** — the body font

No database. No API. Your notes are saved in `localStorage` — they live in your browser.

---

## Want to customize it?

**Add your own holidays**

Open `src/app/page.tsx` and find the `HOLIDAYS` object near the top. Add entries like this:

```ts
"02-14": "Valentine's Day",
"10-31": "Halloween",
```

The format is `"MM-DD": "Holiday Name"`.

**Swap the hero image**

Drop your image into the `public/` folder and update this line in `page.tsx`:

```tsx
<Image src="/your-image.jpg" ... />
```

Any format works — jpg, png, webp, svg.

**Add a new theme**

1. Add a new id to the `Theme` type in `page.tsx`
2. Add it to the `THEMES` array with a label and emoji
3. Add its colors in `globals.css` following the same pattern as the existing themes

---

## A few things worth knowing

- The calendar always shows 6 rows (42 cells) regardless of the month — blank cells fill the gaps
- The week starts on Monday
- All your notes and preferences (theme, dark mode) are remembered between visits via `localStorage`
- The floating dots in the background are drawn on an HTML Canvas — they change color with the theme

---

## Running in production

```bash
npm run build
npm run start
```

---

Built as a Frontend Engineering Challenge. The goal was to make something that feels genuinely polished — not just functional, but enjoyable to use.
=======
# interactive-calendar-ui
A responsive wall-calendar inspired interactive calendar built with Next.js and React featuring date range selection, local notes, and adaptive layouts.
>>>>>>> 9d502a99940f9999c0c6b888a3b48ceb907fbada
