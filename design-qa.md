# Design QA — エンスク授業ノート ver19

## ver19: complete lesson loading and discoverable materials

- Initial HTML renders a neutral loading state, never the bundled single-lesson fallback. Notebook and catalog are applied together after both resolve. Repeat visits read one validated complete snapshot before background refresh; a legacy cache is accepted only when both parts exist. Failed refresh leaves the previous snapshot intact; cold failure offers retry.
- Batched the existing additive catalog initialization into one D1 transaction and coalesced concurrent initialization. Tests verify retry after failure and preservation of shared edits/deleted entries. No migrations or teaching-content changes.
- Replaced the clip-only lesson links with always-visible mint material rows: actual title, service, and a `読む`/image/video action. First two resources are visible; larger collections have an all-materials dialog. Lessons without resources have no empty material block. Original editable URLs are unchanged.
- Browser checked at 320/390/1280px: no horizontal overflow; material anchors at least 60px tall. Modal lists all four 8/18 resources, supports Escape/focus return, and retains safe new-tab links. Captures: `design-evidence/materials-320.jpg`, `materials-390.jpg`, `materials-pc.jpg`. Existing cream/mint/green/orange tone retained.
- Reload was observed with the loading state followed by all four lessons, without a one-lesson intermediate screen. Deferred-response tests cover both response orders; cache, timeout, malformed data, offline refresh and blocked storage are tested separately.
- Regression: flashcard self-rating disabled before reveal; Enter reveals; return to question and save-to-menu work. No browser console errors. Public editor and image upload logic unchanged.
- 43 automated tests passed; backend and GitHub Pages builds, typecheck and source whitespace check passed. Lint has no errors (existing image/static-export and unused legacy-variable warnings remain).

final result: passed

## ver18: learning clarity, no character growth

- User explicitly retired the character-growth theme while keeping the calm tone. Removed companion/wardrobe, star displays, promotion dialogs and result ranks. Existing anonymous progress/recovery and all teaching content remain compatible.
- Added cross-lesson question/answer/teacher search, direct entry at the selected stable card ID, a consolidated review tab, actionable result review list, and unconfirmed/confirmed/review-needed knowledge labels. Lesson rows show card/check counts separately and pending/review state.
- Comparison: `design-evidence/no-growth-comparison.png` pairs the live ver17 menu with ver18 at CSS 390×844. Both captures returned 375×812 and were normalized identically. Cream, mint, green, orange, fonts and outlined controls retained; the owl/wardrobe block is deliberately replaced by study controls. Final combined image was visually inspected.
- 320px: fixed a split lesson-title word by moving the progress count to the panel's upper-right. Fixed the review-count button wrap. Grouped counts wrap as intact labels. 320/390/1280 overflow scans returned no overflowing elements. Screenshots: `no-growth-320.jpg`, `no-growth-390.jpg`, `no-growth-pc.jpg`.
- Browser verified: search `00物件` found six questions across cards/choice/cloze; selected Q2 opened at the correct hidden-answer face, Enter revealed, review addition/180ms advance worked. New review tab showed Q2 with lesson context and linked knowledge; removal persisted after reload. Empty search has an explicit message.
- First correct objective answer displayed the explanation immediately with no promotion dialog. A wrong cloze answer appeared in the results' actionable review list. Knowledge status changed accordingly. Navigation returns to page top. Browser console errors: none.
- Four new automated tests cover index numbering/deletion/deduplication, Unicode-normalized cross-lesson search, meaningful status labels, and absence of growth controls. The legacy progression tests remain for saved-data compatibility, not as active UI features.
- Native OS image D&D is still a manual regression check; existing file-picker upload/render was verified in ver17 and its implementation is unchanged.

final result: passed

## Archived ver17 visual baseline

## Comparison target

- Source: `C:/Users/kobot/.codex/generated_images/019f8196-45a7-7922-a7ee-727ad1aade84/exec-c3865c38-7f56-4b95-b8d7-ccd21dda251e.png` (853×1844).
- Implementation: `design-evidence/home-390-final.png`, local app at localhost:4173, rendered in Codex in-app browser.
- CSS viewport: 390×844, devicePixelRatio 1. The browser returned a proportionally downsampled 375×812 JPEG screenshot. Both panels were normalized to 390×844 for comparison (less than 1px aspect-ratio rounding). No browser device frame was added.
- State: lesson menu, actual 7/21 lesson resumed at 2/28, one collected knowledge/one star. The mock has 3/28 and a different second knowledge: real saved progress/canonical content takes precedence over its sample values.
- Combined full-view evidence: `design-evidence/comparison-390.png` (before), `design-evidence/comparison-390-final.png` (after). Both source and implementation were viewed together, not evaluated separately.
- The 390px panels make all header/button/knowledge text legible. No extra focused crop was needed.

## Findings and iteration

1. [P2, fixed] First comparison had a header/hero block about 24–30px too short and oversized knowledge rows. Added 24px of mobile top/header spacing, increased primary target height, reduced wardrobe spacing and knowledge rows to 56px. Recaptured the same menu state and compared again.
2. [P2, fixed] Excessively heavy menu typography. Reduced base, heading, and button weights while retaining the large readable question face. Final comparison has the selected cream/mint/dark-green hierarchy.
3. [P3, accepted] Original generated owl is a close sibling of the mock, not a pixel crop. It retains green body, cream face, dark contour, book pouch, desk/books/plant and right-side composition. Exact icons come from Phosphor rather than the mock's non-reusable hand drawing.

## Required fidelity surfaces

- Fonts/typography: Japanese sans-serif with Yu Gothic/Meiryo fallbacks, readable dark-green hierarchy; mobile question 24px and answer 21px; semantic Japanese wrapping where browser supports it. No overlapping QUESTION or THINK & REVEAL labels.
- Spacing/layout: retained header → owl → continue → wardrobe → knowledge rows → compact lesson list, with fixed three-tab navigation. Scrollbars are browser chrome, not an app border.
- Colors: cream paper, mint highlights, dark-green outlines, orange primary action. Purple remains only for the established review action.
- Imagery: generated raster assets, correct owl and full-body proportions. Existing approved tile assets unchanged. Uploaded image was checked loaded at its original 66:90 aspect ratio; content images use auto height, not cover cropping.
- Copy/content: エンスク授業ノート / 桜紅さん, real lesson titles/dates/counts; sample mock progress not hardcoded. Diagram text separates canonical wording, applicability, exceptions and source.

## Browser checks

- 320×760, 390×844, 1280×900: DOM overflow scan returned no elements beyond the viewport. Additional captures: `home-320.png`, `home-pc.png`.
- Question/answer flip and return using Space/Enter; rating disabled before reveal; Q2 reload/resume and elapsed time preserved.
- Inline question edit/save/refetch; list edit opened and focused the selected base:2 card.
- Four-choice initial correct answer granted one star; same-day cloze correct answer did not grant a second. Cloze inserts the chosen phrase into the blank.
- Review add/remove, result screen, and previous/next navigation.
- Real card drag reordered Q1/Q2 without changing IDs; up button restored original order. Contiguous question labels checked.
- Browser file chooser uploaded a tile image to local R2, saved markdown, and rendered the full image; test content then restored. Native OS file drag-and-drop was not available through this browser automation surface; its existing FileList handler is retained, but an OS-to-browser drag remains a manual regression check.
- Independent browser storage origins (localhost and IPv6 loopback): recovery restored one star and Q2/28. Teacher link showed no editing controls, and after revocation returned “この共有リンクは利用できません。”
- Resources modal links and Escape dismissal. Companion locked rewards show correct thresholds. Reduced-motion media rule suppresses transitions/animations.
- Final browser console error check: none. A local multi-server D1 lock during QA was resolved by running only one preview; production was not involved.
- 32 automated tests include server grading, JST boundaries, day-7 condition, retransmission, secret hashing/isolation, readonly/revoked sharing, edit/delete/restore and ordering. Typecheck/build passed.

## Implementation checklist

- [x] Selected visual and responsive main flows
- [x] Anonymous progress, recovery and teacher sharing
- [x] Canonical knowledge data, objective progression and companion rewards
- [x] Preserve public editing, image/URL rendering and stable IDs
- [ ] OS-native image drag-and-drop manual check (file picker path verified)

final result: passed
