# LLM Validation Prompt: Baseline Measurements & Token Count Verification

**Purpose**: Validate estimates in `token-inventory.md` before approving the styling refactoring specification.

**Expected Duration**: 10-15 minutes

**Context**: The token inventory contains approximate counts (for example, ~29 gradient color-mix usages and ~31 teal border declarations). This prompt guides an LLM to measure actual values and determine if estimates are within ±20% tolerance.

---

## Prompt for LLM

Copy and paste this prompt into your LLM session:

```markdown
I need you to validate the baseline measurements and token counts for the Artagon styling refactoring specification.

## Context

The project is located at:
`/Users/gtrump001c@cable.comcast.com/Projects/Artagon/artagon-site/`

The following documents contain ESTIMATES that need validation:
- `openspec/changes/refactor-styling-architecture/token-inventory.md`
- `openspec/changes/refactor-styling-architecture/tasks.md` (Section 2: Success Metrics)

## Task 1: Measure Baseline File Sizes

**Goal**: Validate CSS bundle size estimates

**Commands to run**:

1. Measure uncompressed CSS sizes:
   ```bash
   wc -c src/styles/vision.css public/assets/theme.css
   ```

2. Calculate total:
   - vision.css bytes + theme.css bytes = total bytes
   - Convert to KB: total / 1024

3. Measure gzipped sizes (if gzip available):
   ```bash
   gzip -c src/styles/vision.css | wc -c
   gzip -c public/assets/theme.css | wc -c
   ```

**Expected Results** (from token-inventory.md):
- Uncompressed total: ~43KB
- Gzipped total: ~8.7KB

**Validation**:
- ✅ PASS if actual is within ±20% of estimate (34KB - 52KB)
- ❌ FAIL if outside range

**Output Format**:
```
### Baseline CSS Size

**Measured**:
- vision.css: X bytes (Y KB)
- theme.css: X bytes (Y KB)
- Total: X KB (estimate was 43KB)

**Gzipped**:
- Total gzipped: X KB (estimate was 8.7KB)

**Validation**: [PASS/FAIL] (actual is [within/outside] ±20% tolerance)
```

---

## Task 2: Count Gradient Pattern Usages

**Goal**: Validate gradient color-mix usage counts in token-inventory.md Section 1

**Method**: Search for gradient patterns with color-mix in vision.css

**Commands to run**:

1. Count all linear-gradient patterns:
   ```bash
   grep -c "linear-gradient" src/styles/vision.css
   ```

2. Count color-mix patterns (any percentage):
   ```bash
   grep -o "color-mix(in srgb, var(--brand-teal) [0-9]*%" src/styles/vision.css | wc -l
   ```

3. Break down by percentage (from token-inventory.md Table):
   ```bash
   grep -c "color-mix(in srgb, var(--brand-teal) 20%" src/styles/vision.css
   grep -c "color-mix(in srgb, var(--brand-teal) 10%" src/styles/vision.css
   grep -c "color-mix(in srgb, var(--brand-teal) 8%" src/styles/vision.css
   grep -c "color-mix(in srgb, var(--brand-teal) 5%" src/styles/vision.css
   grep -c "color-mix(in srgb, var(--brand-teal) 15%" src/styles/vision.css
   grep -c "color-mix(in srgb, var(--brand-teal) 6%" src/styles/vision.css
   grep -c "color-mix(in srgb, var(--brand-teal) 30%" src/styles/vision.css
   ```

**Expected Results** (from token-inventory.md):
- 20% patterns: 15 usages
- 10% patterns: 3 usages
- 8% patterns: 4 usages
- 5% patterns: 1 usage
- 15% patterns: 3 usages
- 6% patterns: 1 usage
- 30% patterns: 2 usages
- **Total**: ~29 usages

**Validation**:
- ✅ PASS if actual total is 23-35 (±20% of 29)
- ❌ FAIL if outside range

**Output Format**:
```
### Gradient Pattern Counts

**Measured**:
- Total linear-gradient: X
- Total color-mix(teal): X
- Breakdown by percentage:
  - 20%: X (estimate: 15)
  - 10%: X (estimate: 3)
  - 8%: X (estimate: 4)
  - 5%: X (estimate: 1)
  - 15%: X (estimate: 3)
  - 6%: X (estimate: 1)
  - 30%: X (estimate: 2)
- **Total counted**: X (estimate was 29)

**Validation**: [PASS/FAIL] (actual is [within/outside] ±20% tolerance of 29)

**Discrepancies** (if any):
[List percentages that differ significantly from estimates]
```

---

## Task 3: Count Border Pattern Usages

**Goal**: Validate teal border usage counts in token-inventory.md Section 2

**Commands to run**:

1. Count solid teal borders (2px):
   ```bash
   grep -c "2px solid var(--brand-teal)" src/styles/vision.css
   ```

2. Count subtle borders (20% opacity):
   ```bash
   grep "border.*color-mix(in srgb, var(--brand-teal) 20%, transparent)" src/styles/vision.css | wc -l
   ```

3. Count all border declarations with brand-teal:
   ```bash
   grep -c "border.*var(--brand-teal)" src/styles/vision.css
   ```

4. Count border-left specifically:
   ```bash
   grep -c "border-left.*var(--brand-teal)" src/styles/vision.css
   ```

**Expected Results** (from token-inventory.md):
- 2px solid teal: 2 usages
- 2px subtle (20%): 13 usages
- 4px solid teal: 6 usages
- **Total**: ~31 usages

**Validation**:
- ✅ PASS if actual is 25-37 (±20% of 31)
- ❌ FAIL if outside range

**Output Format**:
```
### Border Pattern Counts

**Measured**:
- 2px solid teal: X (estimate: 2)
- 2px subtle (20% opacity): X (estimate: 13)
- 4px solid teal: X (estimate: 6)
- Total border declarations with teal: X
- Border-left with teal: X
- **Total estimated tokenizable borders**: X (estimate was 31)

**Validation**: [PASS/FAIL] (actual is [within/outside] ±20% tolerance of 31)
```

---

## Task 4: Count Spacing Value Usages

**Goal**: Validate spacing usage counts in token-inventory.md Section 3

**Commands to run**:

1. Count section margin values:
   ```bash
   grep -c "margin.*5rem" src/styles/vision.css
   grep -c "margin.*4rem" src/styles/vision.css
   grep -c "margin.*3rem" src/styles/vision.css
   ```

2. Count card padding values:
   ```bash
   grep -c "padding.*2rem" src/styles/vision.css
   grep -c "padding.*1.5rem" src/styles/vision.css
   ```

3. Count common gaps:
   ```bash
   grep -c "gap: 2rem" src/styles/vision.css
   grep -c "gap: 1.5rem" src/styles/vision.css
   grep -c "gap: 1rem" src/styles/vision.css
   ```

**Expected Results** (from token-inventory.md):
- Section margins: 5rem: 19, 4rem: 6, 3rem: 6
- Card padding: 2rem: 15, 1.5rem: 14
- Element gaps: 2rem: 7, 1.5rem: 6, 1rem: 4
- **Total**: ~77 spacing declarations

**Validation**:
- ✅ PASS if actual is 62-92 (±20% of 77)
- ❌ FAIL if outside range

**Output Format**:
```
### Spacing Value Counts

**Measured**:
- Section margins: 5rem: X, 4rem: X, 3rem: X
- Card padding: 2rem: X, 1.5rem: X
- Gaps: 2rem: X, 1.5rem: X, 1rem: X
- **Total estimated tokenizable spacing**: X (estimate was 77)

**Validation**: [PASS/FAIL] (actual is [within/outside] ±20% tolerance of 77)
```

---

## Task 5: Count Border Radius Usages

**Goal**: Validate border radius usage counts in token-inventory.md Section 4

**Commands to run**:

1. Count by value:
   ```bash
   grep -c "border-radius: 12px" src/styles/vision.css
   grep -c "border-radius: 14px" src/styles/vision.css
   grep -c "border-radius: 8px" src/styles/vision.css
   grep -c "border-radius: 999px" src/styles/vision.css
   ```

2. Total border-radius declarations:
   ```bash
   grep -c "border-radius:" src/styles/vision.css
   ```

**Expected Results** (from token-inventory.md):
- 12px: 9 usages
- 14px: 4 usages
- 8px: 7 usages
- 999px: 1 usage
- **Total**: ~29 usages

**Validation**:
- ✅ PASS if actual is 23-35 (±20% of 29)
- ❌ FAIL if outside range

**Output Format**:
```
### Border Radius Counts

**Measured**:
- 12px: X (estimate: 9)
- 14px: X (estimate: 4)
- 8px: X (estimate: 7)
- 999px (pill): X (estimate: 1)
- **Total**: X (estimate was 29)

**Validation**: [PASS/FAIL] (actual is [within/outside] ±20% tolerance of 29)
```

---

## Task 6: Verify Existing Theme Tokens

**Goal**: Confirm claims about existing tokens in theme.css

**Commands to run**:

1. Check for --radius token:
   ```bash
   grep "^  --radius:" public/assets/theme.css
   ```

2. Check for --shadow token:
   ```bash
   grep "^  --shadow:" public/assets/theme.css
   ```

3. Count existing --brand-* tokens:
   ```bash
   grep "^  --brand-" public/assets/theme.css
   ```

**Expected Results** (from token-inventory.md):
- `--radius: 14px` exists (line 11 claim)
- `--shadow: 0 10px 30px rgba(...)` exists (line 12 claim)

**Output Format**:
```
### Existing Theme Tokens

**Measured**:
- --radius token: [FOUND/NOT FOUND] (value: [value if found])
- --shadow token: [FOUND/NOT FOUND] (value: [value if found])
- Existing --brand-* tokens: [list]

**Validation**: [PASS/FAIL] (claims about existing tokens are [accurate/inaccurate])
```

---

## Task 7: Count vision.css Total Lines

**Goal**: Validate baseline line count for reduction target

**Commands to run**:

```bash
wc -l src/styles/vision.css
```

**Expected Results** (from tasks.md):
- Baseline: 1,013 lines
- Target: ≤ 250 lines

**Output Format**:
```
### Vision.css Line Count

**Measured**: X lines (estimate was 1,013)

**Validation**: [PASS/FAIL] (actual is [within/outside] ±5% tolerance)
```

---

## Final Summary Output

After completing all tasks, provide this summary:

```markdown
# Validation Summary

## Overall Results

| Metric | Estimated | Measured | Tolerance | Status |
|--------|-----------|----------|-----------|--------|
| CSS Bundle Size | 43KB | X KB | 34-52KB | [PASS/FAIL] |
| Gradient Usages | 29 | X | 23-35 | [PASS/FAIL] |
| Border Usages | 31 | X | 25-37 | [PASS/FAIL] |
| Spacing Usages | 77 | X | 62-92 | [PASS/FAIL] |
| Radius Usages | 29 | X | 23-35 | [PASS/FAIL] |
| vision.css LOC | 1,013 | X | 963-1,064 | [PASS/FAIL] |
| Existing Tokens | 2 (radius, shadow) | X | Exact match | [PASS/FAIL] |

## Recommendation

**[APPROVE / REQUEST UPDATES]**

### If APPROVE (all metrics within ±20%):
The estimates in token-inventory.md are sufficiently accurate. The specification can be approved as-is. Minor discrepancies will be refined during Phase 1 implementation.

### If REQUEST UPDATES (any metric outside ±20%):
The following estimates are significantly off and should be corrected before approval:

- [List metrics that failed]
- [Recommended corrections]

**Action Required**: Update `token-inventory.md` with measured values, then re-submit for approval.

## Detailed Findings

[Include all measurement outputs from Tasks 1-7 above]
```

---

## Instructions

1. **Run this entire prompt** in a single LLM session with access to the codebase
2. **Execute all bash commands** using the Bash tool
3. **Analyze results** against tolerance ranges
4. **Provide Final Summary** with APPROVE or REQUEST UPDATES recommendation

## Notes

- Use **Bash tool** for all commands (not manual grep)
- If a command fails, note it and continue with alternatives
- ±20% tolerance is intentionally generous (this is a planning estimate, not final measurement)
- Measurements will be re-done in Phase 1 (task 1.1) with more precision
- This validation is just a "sanity check" to catch major errors before approval

---

**Expected Output**: A comprehensive validation report with APPROVE or REQUEST UPDATES recommendation in 10-15 minutes.
```

---

## Usage Instructions

### For LLM (Claude Code, Cursor, etc.)

1. Open the Artagon project directory
2. Copy the entire prompt section above (starting from "I need you to validate...")
3. Paste into LLM
4. Wait for validation report
5. Review recommendation

### For Manual Execution

If you prefer to run commands manually:

1. Open terminal in project root
2. Run commands from Tasks 1-7
3. Compare results to estimates
4. Fill in the Final Summary table
5. Make APPROVE/REQUEST UPDATES decision

---

## Expected Outcomes

### Scenario 1: All Metrics PASS (within ±20%)

**LLM Output**:
```
# Validation Summary
## Overall Results
All metrics within tolerance ✅

## Recommendation
**APPROVE** - Estimates are sufficiently accurate for planning purposes.
```

**Action**: Approve specification, proceed to implementation Phase 1

---

### Scenario 2: Some Metrics FAIL (outside ±20%)

**LLM Output**:
```
# Validation Summary
## Overall Results
2 metrics outside tolerance ❌

- Gradient Usages: Expected 29, measured 45 (+55% over)
- Border Usages: Expected 31, measured 18 (-42% under)

## Recommendation
**REQUEST UPDATES** - Correct token-inventory.md before approval.
```

**Action**:
1. Update `token-inventory.md` Sections 1-4 with actual counts
2. Recalculate estimated impact (Section 10)
3. Re-submit for approval

---

## Integration with OpenSpec Workflow

This validation prompt fits into the OpenSpec process at:

**Current Stage**: Planning → **Approval** → Implementation

```
Planning (complete) ──> Validation (this prompt) ──> Approval ──> Phase 1 Audit
     ↓                           ↓                        ↓            ↓
  estimates               measure actuals          approve spec   implement
```

**After Validation**:
- If PASS → Proceed to approval meeting
- If FAIL → Update docs, re-validate, then approve

---

**Document Version**: 1.0
**Created**: 2025-12-30
**Purpose**: Pre-approval validation of styling refactoring estimates
