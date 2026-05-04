---
version: alpha
name: Good Fixture
description: Lints clean — used by test:design-fixtures snapshot test.
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
spacing:
  md: 16px
rounded:
  md: 8px
components:
  card:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.md}"
---

# Good fixture

## Overview

Test fixture that lints clean with zero errors.

## Colors

Defined: primary, secondary.

## Typography

Defined: h1.

## Components

Defined: card (consumes all declared tokens).
