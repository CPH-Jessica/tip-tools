# Slide Descriptions — "How Skills Actually Work in a Session"
## Foundations of Claude — Week 2 Module Insert

---

## Slide 1: Title Slide

**Title:** The Biggest Skill File Myth (And How to Fix It)
**Subtitle:** Foundations of Claude — Week 2
**Visual:** Clean, dark background. A bookshelf icon with one book pulled halfway out, glowing. The rest are dim.
**Notes:** Sets the tone — something they think they know is about to get corrected.

---

## Slide 2: The Three Layers of Skill Loading

**Title:** How Skills Actually Load
**Visual:** Three horizontal layers stacked vertically, each a different color:

| Layer | Label | Icon | Description shown on slide |
|-------|-------|------|---------------------------|
| Top | **CATALOG** (always on) | Bookshelf / list icon | Claude sees skill names and descriptions |
| Middle | **LOADED** (triggered by you) | Open book icon | Claude reads the full skill instructions |
| Bottom | **ACTIVE** (in working memory) | Brain / writing icon | Claude writes using those instructions |

**Arrow:** Downward arrow between each layer labeled "YOUR PROMPT triggers this"
**Key callout box:** "If you don't trigger it, Claude stays at Layer 1."

---

## Slide 3: What Auto-Loads vs. What Doesn't

**Title:** Every Session: What's On vs. What's Waiting
**Visual:** Two-column layout

**LEFT COLUMN — "Auto-Loads Every Session" (green checkmarks):**
- User Preferences (personality, banned words, rules)
- CLAUDE.md (cold-start operating doc)
- Memory files (stored decisions & facts)

**RIGHT COLUMN — "Needs YOU to Trigger It" (red X marks):**
- Pen name voice skills
- Fiction writing system
- Editing workflows (slash editor, beta readers)
- Series codex / chapter prompts
- Heat calibration profiles

**Bottom callout:** "Your voice skills are NOT running until you say so."

---

## Slide 4: The Fiction Writer's Trap

**Title:** Why Your Output Sounds Generic
**Visual:** Side-by-side chat mockup comparison

**LEFT — "Without Session Opener":**
```
User: Write chapter 3.
Claude: [Generic, flat prose — no voice, wrong heat level,
         chapter starts with weather description]
```
Label: "Skill was on the shelf. Claude didn't open it."

**RIGHT — "With Session Opener":**
```
User: [Full Session Opener prompt]
Claude: [Voice-matched prose — correct heat, action opening,
         character voice distinct]
```
Label: "Skill loaded. Voice active. Output transformed."

---

## Slide 5: The Session Opener Template

**Title:** Your New Writing Ritual: The Session Opener
**Visual:** Clean, formatted prompt template displayed as a "card" or "form" design:

```
Pen name:     [Your pen name]
Project:      [Book title / new or continuing]
Load skill:   [Skill name to trigger]
Context:      [Chapter/scene, where we left off,
               POV character's emotional state]
Voice notes:  [Session-specific overrides —
               tone shifts, heat adjustments,
               character notes for this scene]
```

**Callout arrows** pointing to each field with brief explanation:
- Pen name → "Which voice universe"
- Project → "New draft or continuation"
- Load skill → "THE line that opens the book"
- Context → "Your 'previously on' summary"
- Voice notes → "Fine-tuning for THIS session"

---

## Slide 6: Mid-Session Voice Drift

**Title:** Switching Projects? Reset the Opener.
**Visual:** Timeline/flow diagram showing:

```
[Session Start] → Kelsey Croft loaded → Writing Ch 5, 6, 7...
                                              ↓
                              "Now write Sage's hockey scene"
                                              ↓
                              OUTPUT: Kelsey voice + hockey content
                              (WRONG — Sage skill never loaded)
```

**Fix shown below:**
```
[Mid-session reset] → "Switching projects. New Session Opener:
                       Pen name: Sage Kennedy
                       Load skill: sage-kennedy..."
                                              ↓
                              OUTPUT: Sage voice + hockey content
                              (CORRECT)
```

**Bottom callout:** "New pen name = new Session Opener. Always."

---

## Slide 7: The Clarify-Before-Writing Rule

**Title:** Never Let Claude Write Fiction Blind
**Visual:** Simple decision flowchart:

```
Starting a writing session?
        ↓
Did you specify pen name? → NO → STOP. Add it.
        ↓ YES
Did you name the project? → NO → STOP. Add it.
        ↓ YES
Did you load the skill? → NO → STOP. Add it.
        ↓ YES
Did you give context? → NO → STOP. Add it.
        ↓ YES
NOW Claude can write. ✓
```

**Callout:** "If any answer is NO, Claude is guessing. Don't let it."

---

## Slide 8: Quick Reference Card

**Title:** Skill Loading — 5 Rules to Remember
**Visual:** Clean numbered list, designed to be screenshot-friendly / printable:

1. Skills are **visible** but not **auto-loaded**. Claude sees the catalog. You trigger the file.
2. Pen name skills must be **explicitly called**. Name the pen name. Name the skill. Every session.
3. **Never write fiction blind.** Pen name, project, context, voice notes. Every time.
4. Mid-session switches need a **new opener**. Claude doesn't auto-detect pen name changes.
5. User Preferences + CLAUDE.md + Memory **do carry** automatically. Voice skills **do not**.

**Footer:** "Print this. Tape it next to your monitor."

---

## Production Notes

- All slides should use TIP brand colors (confirm with Jessica)
- Chat mockup screenshots can be created as simple text boxes — no need for actual Claude UI recreation
- Slide 5 (Session Opener) should be designed as a standalone asset students can screenshot and reuse
- Slide 8 (Quick Reference) should also work as a printable reference card
- Total: 8 slides for ~18 minutes of content
