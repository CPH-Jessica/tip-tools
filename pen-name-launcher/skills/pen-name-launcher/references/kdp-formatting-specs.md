# KDP Formatting Specs: Ebook & Print Requirements

KDP (Kindle Direct Publishing) has specific technical requirements for both ebook and print. Get these details right the first time. Rejection isn't a disaster, but it costs you time. This guide lists every spec you need to know.

---

## Ebook Files

KDP accepts three file formats for ebook. Pick one.

**Preferred Format: .EPUB (Reflowable)**

An EPUB file is a reflowable format, meaning it adapts to any screen size. Readers on Kindle devices, phones, tablets, and web browsers all see your book formatted correctly for their device.

Use EPUB if:
- You want your book to look good on any device
- You're comfortable with minimal formatting control
- Your book is primarily text (not heavily illustrated)

**Alternative Format: .MOBI (Kindle Native)**

MOBI is Amazon's native Kindle format. It's older, less flexible than EPUB, but still works fine for text-heavy books.

Use MOBI if you're submitting directly to Amazon's legacy system, but honestly, EPUB is now standard and preferred. Most indie authors use EPUB.

**File Format: Microsoft Word (.DOCX)**

You can upload a .DOCX file (Microsoft Word) directly to KDP. Amazon converts it to a Kindle-compatible format on their end.

Use DOCX if:
- You're formatting directly in Word and want to submit as-is
- You want simplicity and don't want to learn EPUB conversion
- Your book is straightforward text with minimal special formatting

Note: DOCX uploads are more prone to formatting issues during conversion. Proofread carefully after uploading a DOCX.

---

## Ebook File Specs: What KDP Actually Needs

**File Size:** Maximum 50 MB. Your manuscript with images will be far under this. Don't worry unless you're including a lot of high-resolution images.

**Fonts:** Use common, readable fonts. Embed fonts if you're using anything uncommon. KDP recommends: Calibri, Carlito, DejaVu, Liberation, Linux, and Times New Roman. Avoid ornamental or script fonts for body text (they become unreadable on small screens).

**Text Encoding:** Use UTF-8 encoding (standard). This ensures special characters, accents, and non-English text display correctly.

**Margins:** Minimum 0.5 inches on all sides. Readable margins (0.75-1 inch) are better. KDP adjusts margins on device-level, but having minimum margins ensures text doesn't cut off.

**Font Size:** Don't specify exact font size in your manuscript. Instead, use heading and body text styles. Readers adjust font size on their devices, and you want your formatting hierarchy (headings, body, subheadings) to scale proportionally.

**Line Spacing:** Use 1.5 or double spacing. Single-spaced text becomes unreadable on small devices. Ebook readers expect breathing room.

**Images in Ebook:** If you include images (interior art, headers), resolution should be 72-150 DPI. Higher resolution = larger file size with no visual benefit on screen. Keep images embedded in your file, not linked.

**Chapter Breaks:** Use page breaks between chapters. Readers can navigate chapter-by-chapter if your file is properly structured. Use KDP's Table of Contents feature (automatic or manual) so readers can jump to chapters.

**Italics and Bold:** Use actual italic/bold formatting, not underlining or different fonts. Screen readers (for accessibility) need real formatting to interpret correctly.

**Special Characters:** Avoid smart quotes (curly quotes) in your source file if submitting DOCX. They sometimes convert incorrectly. Use straight quotes. If submitting EPUB, smart quotes are fine. Test after uploading.

---

## Ebook Cover (Kindle Ebook Cover)

**Dimensions:** 1600 x 2560 pixels (height x width). This is non-negotiable.

**Aspect Ratio:** 1:1.6 (width to height). Your cover is taller than it is wide, like a book spine standing up.

**File Format:** JPEG or PNG.

**File Size:** Maximum 50 MB (you won't hit this).

**Resolution:** 72 DPI is fine. Higher resolution is unnecessary for screen display and just inflates file size.

**Safe Zone:** Don't put critical text or images within 40 pixels of the edge. The edges might be cut off on some devices or wrapped around in 3D displays.

**Bleed:** Not needed for ebook covers. Your cover displays on a screen, not printed.

**Quality:** Your cover should look crisp at thumbnail size (140 x 224 pixels is how it displays in search results). Test your cover at thumbnail size before uploading.

---

## Print Files

KDP's print options include paperback and hardcover. Print requires more precision than ebook.

**Preferred Format: PDF**

Submit your print interior as a PDF. PDFs preserve exact formatting, fonts, images, and spacing. What you see in your PDF is what prints.

**Alternative Format: .DOCX**

You can submit DOCX for print, but KDP converts it, and conversion can introduce formatting shifts. PDF is safer.

**File Name:** Name your PDF something clear. "MyBook_Interior_Final" is better than "Document1."

---

## Print Interior File Specs

**Trim Size:** KDP offers several trim sizes. Common sizes for indie authors:

- 5" x 8" (standard paperback, most popular for fiction)
- 6" x 9" (larger, more professional-looking)
- 8.5" x 11" (large format, rarely used for fiction)

Choose one size. Your interior file dimensions must match your trim size exactly.

**Page Count & Spine:** Your book's page count determines spine width.

Formula: (Page Count × 0.002") + 0.15" = Spine Width

Example: A 300-page book has a spine width of (300 × 0.002") + 0.15" = 0.75"

**Bleed:** Bleed is extra space beyond your trim size that gets cut off during printing. Without bleed, images/colors that go to the edge look like they're floating.

Required bleed for KDP:
- 0.125 inches (1/8 inch) on all sides

If your trim size is 5" x 8", your PDF file should be 5.25" x 8.25" (adding 0.125" on all sides).

**Margins (Inside Content Area):** 

Recommended minimum margins:
- Top: 0.5 inch
- Bottom: 0.5 inch
- Outside (right for right pages, left for left pages): 0.75 inch
- Inside (gutter, toward spine): 0.75 inch (accounts for binding)

These margins ensure text doesn't print in the gutter or too close to the edge.

**Bleed + Margins Layout:**

Your PDF layout goes: [Bleed] → [Margin] → [Text Content] → [Margin] → [Bleed]

The bleed disappears in printing. What readers see is your margin and content.

**Cover (Print Paperback Cover)**

Your print cover is three separate files combined:
1. Front cover
2. Spine
3. Back cover

Or one single file with front cover + spine + back cover combined.

**Combined Cover File Dimensions:**

Formula: (Front Width + Spine Width + Back Width) × Cover Height

Example: For a 5" x 8" trim book:
- Front cover: 5" wide
- Spine: 0.75" wide (from the formula above)
- Back cover: 5" wide
- Cover height: 8"

Combined file = 10.75" x 8"

Each section gets 0.125" bleed on outer edges.

**Cover File Format:** PDF or JPEG.

**Resolution:** 300 DPI (print requires higher resolution than ebook). This ensures text and images are crisp when printed.

**File Size:** Maximum 200 MB (you won't exceed this for a standard book cover).

---

## Common Rejection Reasons (and How to Avoid Them)

**Bleed Missing**

Error: Your interior PDF doesn't have 0.125" bleed on all sides.

Fix: Re-export your PDF with bleed included, or add a 0.125" buffer to your file size. If you're building in InDesign or a professional layout tool, set up the document with bleed from the start.

**Text Too Close to Spine**

Error: Text in the gutter (inside margin near the spine) gets cut off or is unreadable after binding.

Fix: Make sure your inside margin (gutter) is at least 0.75 inches. Test by printing a sample if you can.

**Image Resolution Too Low**

Error: Your cover or interior images are 72 DPI (screen resolution) instead of 300 DPI (print resolution).

Fix: Re-export images at 300 DPI. If you're using JPEG images from online, don't use them. They're too low quality for print. Commission new images or use stock images licensed for print.

**Font Not Embedded or Not Licensed for Printing**

Error: You used a font that isn't installed on KDP's system, or your font license doesn't allow embedding.

Fix: Use common fonts (Calibri, Garamond, Times New Roman, Georgia, etc.) or embed your fonts when you create the PDF. Check your font license before submitting.

**Page Size Mismatch**

Error: Your PDF is 6" x 9" but you selected 5" x 8" trim size in KDP.

Fix: Make sure your PDF dimensions match your selected trim size exactly. Check KDP's specs for your chosen size.

**Margins Too Small**

Error: Text is cut off at the edges or prints too close to binding.

Fix: Add minimum 0.5" top/bottom margins and 0.75" gutter margin. Proofread the margins before uploading.

**Cover Dimensions Wrong**

Error: Your cover file is the wrong dimensions for your trim size.

Fix: Use KDP's cover calculator (on their site) to get exact dimensions. Screenshot or save the dimensions and build your cover to those specs exactly.

**Spine Too Narrow**

Error: Your spine width is calculated incorrectly, or you didn't include spine in a single combined cover file.

Fix: Use the spine formula: (Page Count × 0.002") + 0.15". Double-check your math. If submitting a combined cover file, make sure the spine section is in the middle.

---

## KDP's Cover Designer Tool

If you don't have a designer or design skills, KDP offers a free Cover Designer tool. You upload a cover image (or let KDP generate one), and the tool automatically formats it to the correct dimensions with bleed.

**When to use it:** If you need a quick, functional print cover and design isn't your strength.

**Limitation:** Limited customization. Your options are templates and your own image.

---

## Workflow: From Manuscript to KDP Upload

**Step 1: Finalize your manuscript.** Edit, proofread, format.

**Step 2: Create your ebook file.** Export to EPUB, MOBI, or DOCX.

**Step 3: Create your print interior file.** Use your manuscript as the base. Add proper margins, bleed, and check font embedding.

**Step 4: Create your cover.** Ebook cover (1600 x 2560) and print cover (dimensions calculated for your trim size).

**Step 5: Proofread everything.** Read through your files to catch formatting issues. Check text placement, fonts, images.

**Step 6: Upload to KDP.** Enter metadata (title, author, description), upload interior and cover files, and submit.

**Step 7: Review proof.** KDP generates a proof you can download and review. Look for formatting issues, text placement, image quality. Make corrections if needed.

**Step 8: Approve and publish.** Once you're satisfied, approve the proof and set your publication date.

---

## Quick Reference: File Specs at a Glance

| Component | Dimension | Format | DPI | Notes |
|---|---|---|---|---|
| Ebook Interior | Flexible | EPUB/MOBI/DOCX | 72 | Line spacing 1.5+, standard fonts |
| Ebook Cover | 1600 x 2560 px | JPEG/PNG | 72 | Safe zone: 40px from edge |
| Print Interior | Match trim size + 0.25" bleed | PDF | 300 | Includes 0.125" bleed all sides |
| Print Cover (combined) | (5+0.75+5) x 8 for 5x8 example | PDF/JPEG | 300 | Bleed on outer edges only |
| Spine Width | (Page Count × 0.002") + 0.15" | Calculated | — | Built into cover file |

---

## Final Checklist Before Uploading

- [ ] Interior file is properly formatted with correct trim size + bleed
- [ ] Margins are minimum 0.5" (top/bottom) and 0.75" (gutter)
- [ ] Cover is correct dimensions for trim size
- [ ] Cover is 300 DPI (print) or 72 DPI (ebook)
- [ ] All fonts are common or embedded
- [ ] Images are correct DPI for their use (72 for ebook, 300 for print)
- [ ] No text is cut off at the edges
- [ ] Spine width is calculated and correct
- [ ] File names are clear and properly labeled
- [ ] Files are saved in correct formats (PDF for print, EPUB for ebook)

You're ready to upload.
