# Kenya Airways – Next.js Page

## File Structure

```
kenya-airways/
├── layout.jsx                   # Root Next.js layout (fonts, metadata, Material Symbols)
├── page.jsx                     # Main page (Hero, Offers, Plan Trip, Experience, Rewards)
├── tailwind.config.js           # Design tokens matching the original
└── components/
    ├── Header.jsx               # Fixed top nav with mobile menu toggle
    ├── Footer.jsx               # Footer with link columns and copyright
    └── BookingWidget.jsx        # Trip type toggle + flight search inputs
```

## Setup (App Router)

```
your-next-app/
└── app/
    ├── layout.js          ← copy layout.jsx here
    ├── page.js            ← copy page.jsx here
    └── components/
        ├── Header.jsx
        ├── Footer.jsx
        └── BookingWidget.jsx
```

## Install dependencies

```bash
npm install
npm install -D @tailwindcss/forms
```

## tailwind.config.js

Copy `tailwind.config.js` to your project root and merge with any existing config.
Make sure `content` paths cover your app directory.

## Notes

- All components use the **App Router** (`"use client"` where state is needed).
- `Header` and `BookingWidget` are client components (they use `useState`).
- `Footer` and `page.jsx` sections are server components by default.
- Material Symbols Outlined is loaded via Google Fonts in `layout.jsx`.
- Hanken Grotesk is loaded via `next/font/google` for zero layout shift.
- The `primary` color (`#bb0013`) is used throughout — override in `tailwind.config.js`.
