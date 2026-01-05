# PDFToolkit

![Project Preview](./public/preview-screenshot.png)

PDFToolkit is a suite of high-performance PDF utilities that processes all files **on the client side**. Your files never leave your device, ensuring total privacy and near-instant processing speeds.

**Link:** [https://pdftools-inky.vercel.app/](https://pdftools-inky.vercel.app/)

---

## Tools Included

- **Merge PDF** `call_split arrow_outward`  
  Combine PDFs in the order you want easily.

- **Split PDF** `description arrow_outward`  
  Separate pages into independent files.

- **PDF to Word** `article arrow_outward`  
  Convert PDF to Word with accuracy.

- **Word to PDF** `edit_document arrow_outward`  
  Convert DOCX files to PDF format.

- **Edit PDF** `image arrow_outward`  
  Add text, images, and annotations.

- **PDF to JPG** `crop arrow_outward`  
  Extract images or convert pages to JPG.

- **Crop PDF** `collections arrow_outward`  
  Crop PDF pages to a specific size.

- **JPG to PDF** `ink_pen arrow_outward`  
  Convert images to PDF in seconds.

- **Sign PDF** `branding_watermark arrow_outward`  
  Sign documents and request signatures.

- **Watermark** `rotate_right arrow_outward`  
  Stamp images or text over PDFs.

- **Rotate PDF** `rotate_right arrow_outward`  
  Rotate multiple documents at once.

---

## Tech Stack

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

- **Framework:** Next.js 14+ (App Router)  
- **PDF Engine:** `pdf-lib` (modification) and `PDF.js` (rendering)  
- **Styling:** Tailwind CSS  
- **Interactions:** `dnd-kit` for drag-and-drop page reordering  
- **Typography:** [Geist](https://vercel.com/font) via `next/font`

---

## Getting Started

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Zintl-e/pdftoolkit.git

   ```

2. **Navigate to the project folder**
   ```bash
   cd pdftoolkit
   ```

3. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

---

## Run Locally

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You can start editing the page by modifying `app/page.tsx`. The page will auto-update as you save changes.

---

## Production Build

Create an optimized production build:

```bash
npm run build
npm run start
```

---

## Privacy & Security

- **Zero Uploads:** Files are read into temporary browser blobs and cleared when the tab is closed.

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — Learn about Next.js features and APIs  
- [Learn Next.js](https://nextjs.org/learn) — Interactive Next.js tutorial  
- [Next.js GitHub Repository](https://github.com/vercel/next.js) — Feedback and contributions welcome

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is with the **Vercel Platform**, created by the makers of Next.js.

See the official [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
