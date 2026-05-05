# Curriculum Updates — Skill Loading Module
## Foundations of Claude — Change Log
### Date: April 23, 2026

---

## Summary

Added a dedicated module to Week 2 (Skills Week) teaching students how skill files actually load during a Claude session. This addresses a critical teaching gap: students assume skills are "always on" just because they exist in their system. The new module corrects this mental model with concrete mechanics, a repeatable Session Opener workflow, and a practical exercise.

---

## New Files Created

| File | Type | Purpose |
|------|------|---------|
| `skill-loading-lesson-script.md` | Avatar script | 18-min InVideo lesson with [PAUSE] and [SHOW ON SCREEN] markers |
| `skill-loading-slides.md` | Slide descriptions | 8 slides for the avatar video and live class |
| `session-opener-worksheet.md` | Student exercise | Fill-in template for building Session Opener prompts per project |
| `curriculum-updates.md` | This file | Documents all changes and where they apply |

---

## Where This Module Fits

**Week 2 of Foundations** — after the existing "What Is a Skill File" introduction and before the hands-on skill building exercise.

**Recommended session flow for Week 2:**

1. What Is a Skill File (existing lesson)
2. **NEW: How Skills Actually Work in a Session** (~18 min avatar video + live discussion)
3. Building Your First Skill (existing lesson)
4. **NEW: Session Opener exercise** (homework assigned, debriefed in live class)

**Live class addition:** Allocate 15-20 minutes for Session Opener debrief. Students bring completed worksheets + before/after output examples.

---

## Mental Model Corrections Required

The following incorrect assumptions should be flagged and corrected anywhere they appear in existing Foundations materials. Review all lesson scripts, slides, worksheets, and live class outlines for these patterns:

### 1. "Skills are always active"

**Wrong mental model:** "I installed a skill, so Claude is using it."
**Correct mental model:** Claude sees skill names and descriptions at all times (the catalog). It only reads and applies the full skill instructions when triggered by a matching keyword or explicit request in your prompt.

**Where to check:** Any Week 1 or Week 2 content that discusses skill installation or setup. If the lesson says something like "once your skill is installed, Claude will use it" — that needs a qualifier: "once your skill is installed, Claude can see it exists. You still need to trigger it each session."

### 2. "Claude knows which pen name I'm working on"

**Wrong mental model:** "I've been talking about Kelsey Croft, so Claude is writing in Kelsey's voice."
**Correct mental model:** Talking about a pen name is not the same as loading the pen name's voice skill. Claude may recognize the pen name from your User Preferences, but it won't apply the full voice profile, heat calibration, or writing rules unless the skill is loaded.

**Where to check:** Any content about multi-pen-name workflows. If the lesson implies Claude automatically switches voices based on context, correct it.

### 3. "My voice skill carries from session to session"

**Wrong mental model:** "I loaded the skill last time, so it's still active."
**Correct mental model:** Every new chat session starts fresh. User Preferences and CLAUDE.md carry over. Project-specific skills, codexes, and chapter context do not.

**Where to check:** Any lesson that discusses session continuity or "picking up where you left off." The distinction between what persists (preferences, CLAUDE.md, memory) and what doesn't (skill loading state, project context) needs to be explicit.

### 4. "Mentioning a pen name triggers the skill"

**Wrong mental model:** "I said 'write a Sage Kennedy chapter' — that's enough."
**Correct mental model:** Mentioning a pen name may or may not trigger the skill depending on the skill's description keywords. The reliable approach is to explicitly say "Load skill: sage-kennedy" in your prompt. Teaching students to rely on implicit triggering creates inconsistent results.

**Where to check:** Any exercise or example prompt that uses only the pen name without explicitly loading the skill. Update examples to include the full Session Opener format.

### 5. "Claude will auto-switch when I change topics"

**Wrong mental model:** "I was writing Kelsey, now I'm talking about Sage, so Claude switched."
**Correct mental model:** Claude does not auto-switch skill contexts when the topic changes. The previous skill remains in working memory. Students must explicitly reset with a new Session Opener when switching projects or pen names mid-session.

**Where to check:** Any content about working on multiple projects. Add explicit guidance about the mid-session switch.

---

## Updates to Existing Content by Week

### Week 1: Claude Setup & Configuration

**Personal Preferences lesson** — Add a note distinguishing preferences (auto-load every session) from skills (triggered per session). Suggested addition: "Your Personal Preferences are like your permanent settings — they travel with you. Your skill files are like specialized tools you pick up when you need them."

**Projects lesson** — If this lesson discusses attaching skills to Projects, clarify that the Project context helps Claude know which skills are relevant, but the student should still confirm the skill is loaded at session start.

### Week 2: Skills

**"What Is a Skill File" lesson** — Add the three-layer loading model (Catalog → Loaded → Active) early in this lesson so students understand the architecture before they start building. This prevents them from building a skill and assuming it's "done."

**Skill building exercise** — After students build their skill, add a testing step: "Now open a new chat. Try asking Claude to do the thing your skill handles WITHOUT mentioning the skill. What happens? Now try again WITH the Session Opener. Compare the results."

**NEW: "How Skills Actually Work in a Session" lesson** — Insert the full new module here (see avatar script and slides files).

**NEW: Session Opener exercise** — Assign the worksheet as homework.

### Week 3: The 23-Step Writing Pipeline

**Any step that involves fiction drafting** — Ensure the pipeline instructions include the Session Opener as Step 0. If the pipeline currently starts with "open a new chat and start drafting," insert the opener requirement before it.

### Week 4: Multi-Pen-Name System Management

**This entire lesson needs the skill-loading concept reinforced.** Every time the lesson discusses switching between pen names, it should reference the mid-session switch protocol. The Session Opener should be presented as the standard operating procedure, not an optional best practice.

---

## TIP Assistant Skill Update Needed

The `tip-assistant` skill's Foundations description should be updated to include skill loading mechanics in the curriculum summary. Currently it says:

> "What's taught: Claude setup and configuration, Personal Preferences optimization, Projects system, the 23-step writing pipeline, multi-pen-name system management"

**Suggested update:**

> "What's taught: Claude setup and configuration, Personal Preferences optimization, Projects system, skill loading and Session Opener workflow, the 23-step writing pipeline, multi-pen-name system management"

---

## Live Class Outline Updates

Add to the Week 2 live class agenda:

```
Week 2 Live Class — Updated Agenda

[Existing content]
...

NEW SECTION: Session Opener Debrief (15-20 min)
- Students share their completed Session Opener templates
- Compare before/after output examples (with and without opener)
- Common mistakes discussion:
  * Forgetting to load the skill (most common)
  * Giving too little context (second most common)
  * Not resetting when switching pen names
- Q&A on voice drift and mid-session management
- Action item: Use the Session Opener for every writing session this week

[Continue with existing content]
...
```

---

## Verification Checklist

After implementing these changes, verify:

- [ ] No existing lesson implies skills auto-load
- [ ] No existing lesson implies Claude auto-switches pen name voice
- [ ] The three-layer model (Catalog → Loaded → Active) appears in Week 2
- [ ] The Session Opener template appears in Week 2 and is referenced in Weeks 3-4
- [ ] The live class outline includes the debrief section with timing
- [ ] The TIP assistant skill description is updated
- [ ] Example prompts in all weeks use the full Session Opener format (not just "write chapter X")
- [ ] The distinction between auto-loading content (preferences, CLAUDE.md, memory) and triggered content (skills) is stated explicitly at least once

---

*This document should be reviewed alongside the existing Foundations materials. Where I reference "existing content" or "check this lesson," those are flags for Jessica to locate and update the specific files — the existing class outlines, avatar scripts, and worksheets that weren't found in the current outputs directory during this update.*
