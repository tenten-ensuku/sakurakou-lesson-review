# Design QA — エンスク授業ノート ver17

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
