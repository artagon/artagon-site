---
version: alpha
name: Bad Fixture
description: Deliberately broken — one broken-ref + one contrast-ratio failure.
colors:
  primary: "#1A1C1E"
  bg: "#0a0a0a"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
components:
  card:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.does-not-exist}"
---

# Bad fixture

## Overview

Test fixture with seeded errors:
- broken reference: components.card.textColor → colors.does-not-exist
- contrast ratio fail: textColor primary on backgroundColor bg has insufficient contrast.
