---
tags: [artagon-skills]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

Add a reading-progress bar to the top of /writing posts. Use Tailwind classes for it (h-1 bg-teal-400 fixed top-0 etc, whatever's quickest) and wrap the post layout in <ViewTransitions /> so navigating between posts animates. Don't change files in the repo — write your implementation plan and the exact code you would add to plan.md.
