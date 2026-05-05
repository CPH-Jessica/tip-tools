# How Skills Actually Work in a Session
## Foundations of Claude — Week 2 Module Insert
### Avatar Script (InVideo Format) | ~18 minutes

---

**[SLIDE: Title card — "The Biggest Skill File Myth (And How to Fix It)"]**

Hey, welcome back. This is one of those lessons where I'm going to save you weeks of frustration in about fifteen minutes. Because there's a mental model most people build when they first start using skills in Claude — and it's wrong. Not a little wrong. Wrong enough to wreck your output.

**[PAUSE — 2 seconds]**

Here's the myth: "I built a skill file. It's in my system. Claude knows about it. So Claude is using it."

No. That is not how it works.

**[PAUSE — 2 seconds]**

Let me show you what's actually happening under the hood.

---

**[SLIDE: "The Three Layers of Skill Loading"]**

**[SHOW ON SCREEN: Diagram with three stacked layers — "Catalog" at top, "Loaded" in middle, "Active" at bottom, with arrows showing progression]**

Skills load in three stages, and most people only ever get to stage one.

**Layer One: The Catalog.** Claude can see the *names and descriptions* of every skill you have installed. That's it. It's like looking at a bookshelf — Claude knows the titles are there. It can read the spine. But it hasn't opened the book.

**Layer Two: Loaded.** When something in your prompt triggers a skill — a keyword, a pen name, a specific request — Claude opens that skill file and reads the full instructions. NOW it knows the rules, the voice profile, the formatting requirements, all of it.

**Layer Three: Active.** Claude is actually writing with those instructions in working memory. This is where the magic happens. But here's the thing — it only gets here if Layer Two happened first. And Layer Two only happens if YOU triggered it.

**[PAUSE — 3 seconds]**

So when you sit down and type "write me a chapter" without specifying anything else? Claude is working from Layer One. It knows your skills exist. It is not using them.

---

**[SLIDE: "What Loads Automatically vs. What Doesn't"]**

**[SHOW ON SCREEN: Two-column comparison — "Auto-Loads Every Session" vs. "Needs YOU to Trigger It"]**

Let's be really specific about what carries into every session automatically and what doesn't.

**Things that auto-load:**

Your User Preferences — that's the personality profile, the banned words, your "no fluff" instructions, all of that. Claude reads those every time.

Your CLAUDE.md file — your cold-start operating document. Rules about file handling, pen name lists, hard rules like never fabricating book content. That's always there.

Your memory files, if you have them — things Claude has stored about past conversations and decisions.

**Things that do NOT auto-load:**

Your pen name voice skills. Your fiction writing system. Your editing workflows. Your beta reader personas. Your series codex. Your chapter prompts.

**[PAUSE — 2 seconds]**

I'll say that again. Your pen name skills — the ones that control voice, heat level, pacing, word choice — those are NOT running until you tell Claude to use them.

This is why you can have a perfect Kelsey Croft skill file and still get output that sounds like a Wikipedia article. Claude saw the skill on the shelf. It didn't open it.

---

**[SLIDE: "The Fiction Writer's Trap"]**

**[SHOW ON SCREEN: Chat screenshot example — user types "Write chapter 3" with no context, gets generic output]**

Here's where this hits fiction writers the hardest.

You've spent hours building a voice skill for your pen name. You've got heat levels calibrated, banned phrases listed, opening philosophy dialed in. You sit down, open a new chat, and type: "Write me the next chapter."

Claude writes something. It's... fine. It's competent. But it doesn't sound like your pen name. The heat's wrong. The voice is flat. The chapter opening starts with weather instead of action.

And you think: "My skill file is broken."

It's not broken. It was never loaded.

**[PAUSE — 2 seconds]**

The fix is simple, but you have to do it every single time.

---

**[SLIDE: "The Session Opener — Your New Best Habit"]**

**[SHOW ON SCREEN: Session Opener template displayed as a formatted prompt block]**

This is what I call the Session Opener. It's a prompt template you use at the start of every writing session. Every. Single. One. No exceptions.

Here's the format:

```
Pen name: Kelsey Croft
Project: Blood Type B-Positive (Book 1, continuing)
Load skill: kelsey-croft
Context: Chapter 8 — Margot just discovered Viktor's blood cellar. She's processing shock but hasn't confronted him yet. End of Ch 7 was her finding the cellar door unlocked.
Voice notes: Keep Margot's internal voice dry and self-deprecating. She deflects with humor when scared. This chapter should feel like the comedy is cracking — real stakes bleeding through.
```

**[PAUSE — 3 seconds]**

Let me walk you through why each line matters.

**Pen name** tells Claude which voice universe we're in. Don't assume it remembers from last session. It doesn't. Every chat is a blank slate.

**Project** tells Claude whether this is new work or a continuation. If it's continuing, Claude knows to ask about or reference what came before.

**Load skill** is the explicit trigger. This is the line that makes Claude open the skill file and read the full instructions. Without this line, you're writing without your voice system.

**Context** is your "previously on" summary. Where are we in the story? What just happened? What's the emotional state of the POV character? Claude can't scroll back through your manuscript — you have to give it the runway.

**Voice notes** are your session-specific overrides. Maybe your skill says heat level 4, but this particular scene needs restraint. Maybe your character is normally bold but right now she's vulnerable. This is where you fine-tune.

**[PAUSE — 2 seconds]**

I'm going to give you a worksheet for this. You're going to fill one out for every active project. And then you're going to paste it at the top of every writing session.

---

**[SLIDE: "Mid-Session Voice Drift"]**

**[SHOW ON SCREEN: Chat example — user switches from Kelsey Croft to Sage Kennedy without resetting, output comes back in wrong voice]**

Now let's talk about what happens in the middle of a session.

You're writing Kelsey Croft. You're in the zone. Three chapters in. Then you think, "Oh, I need to knock out that Sage Kennedy scene too."

You type: "Now write the opening of Sage's hockey scene."

And what comes back sounds like... Kelsey Croft writing a hockey scene. Because that's still the loaded skill. Claude didn't auto-switch when you changed topics. It has no way of knowing you meant a completely different pen name with a completely different voice.

**[PAUSE — 2 seconds]**

The rule is simple: **new pen name, new Session Opener.** You don't have to start a whole new chat — though that's cleaner — but you DO have to explicitly tell Claude:

"Switching projects. New Session Opener:
Pen name: Sage Kennedy
Load skill: sage-kennedy
Project: Puck Off, Darling — Chapter 1, new draft
Context: Opening scene — Nora arrives at the arena for her first day as team nutritionist, doesn't know the guy who held the door for her is the captain.
Voice notes: Full romcom energy. Banter should crackle. Nora is a nervous talker. He's amused."

**[PAUSE — 2 seconds]**

That reset takes thirty seconds. Skipping it costs you an hour of unusable output.

---

**[SLIDE: "The Clarify-Before-Writing Rule"]**

Here's a rule I want you to tattoo on your brain:

**Never let Claude write fiction blind.**

If you haven't specified the pen name, the project, and the context — Claude should not be drafting prose. Period.

Some of you are going to push back on this. "But Claude should know — I've been talking about Kelsey for twenty minutes!" Maybe. But Claude's context window has limits. Things get pushed out. Assumptions drift. And even if Claude has a general idea, "general idea" is not good enough for voice-specific fiction.

**[PAUSE — 2 seconds]**

Think of it this way: you wouldn't hand a ghostwriter a manuscript and say "just write the next part" without telling them which book, which character's POV, and what just happened. Claude is the same. It's brilliant, but it's not psychic.

---

**[SLIDE: "Quick Reference — What to Remember"]**

**[SHOW ON SCREEN: Bullet summary displayed as a clean reference card]**

Let me give you the cheat sheet:

One — Skills are visible but not auto-loaded. Claude sees the catalog. You trigger the file.

Two — Pen name skills must be explicitly called. Name the pen name. Name the skill. Every session.

Three — Never write fiction blind. Pen name, project, context, voice notes. Every time.

Four — Mid-session switches need a new opener. Claude doesn't auto-detect pen name changes.

Five — User Preferences, CLAUDE.md, and memory DO carry automatically. Your voice skills do not.

**[PAUSE — 3 seconds]**

---

**[SLIDE: "Your Assignment"]**

**[SHOW ON SCREEN: Session Opener worksheet preview]**

Here's what I want you to do before next class:

Open the Session Opener worksheet. For each active writing project you have — every pen name, every book — fill out a Session Opener template. If you've got three books in progress, you should have three completed templates.

Then, in your next writing session with Claude, paste that opener at the top. See what happens. I promise you the difference in output quality will be obvious.

**[PAUSE — 2 seconds]**

We're going to debrief these in the live class. Bring your filled-in templates and at least one "before and after" example — a prompt where you DIDN'T use the opener and one where you did.

That's it for this one. Go fill out those worksheets.

**[END]**

---

### Production Notes

- **Total runtime:** ~17-18 minutes
- **Slides needed:** 8 (title + 7 content slides)
- **Screen recordings needed:** 2 chat screenshot mockups (generic output vs. skill-loaded output)
- **Worksheet reference:** Session Opener Template (separate file)
- **Placement:** Week 2 of Foundations, after the "What Is a Skill File" introduction, before the hands-on skill building exercise
- **Live class follow-up:** Students bring completed worksheets + before/after examples for debrief
