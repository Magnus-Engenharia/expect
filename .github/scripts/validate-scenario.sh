#!/usr/bin/env bash
set -euo pipefail

JSON_FILE="${1:?Usage: validate-scenario.sh <json-file> <scenario-name>}"
SCENARIO="${2:?Usage: validate-scenario.sh <json-file> <scenario-name>}"

ERRORS=0
WARNINGS=0

error() {
  echo "::error::[$SCENARIO] $1"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo "::warning::[$SCENARIO] $1"
  WARNINGS=$((WARNINGS + 1))
}

info() {
  echo "[$SCENARIO] $1"
}

# File exists and is non-empty
if [ ! -f "$JSON_FILE" ]; then
  error "JSON file not found: $JSON_FILE"
  exit 1
fi

if [ ! -s "$JSON_FILE" ]; then
  error "JSON file is empty: $JSON_FILE"
  exit 1
fi

# Valid JSON
if ! jq -e . "$JSON_FILE" > /dev/null 2>&1; then
  error "Invalid JSON in $JSON_FILE"
  echo "First 20 lines:"
  head -20 "$JSON_FILE"
  exit 1
fi

info "Valid JSON file found"

# Required top-level fields
for field in version status title duration_ms steps summary; do
  if ! jq -e "has(\"$field\")" "$JSON_FILE" > /dev/null 2>&1; then
    error "Missing required field: $field"
  fi
done

# version is a string
VERSION=$(jq -r '.version // empty' "$JSON_FILE")
if [ -z "$VERSION" ]; then
  error "version is empty or missing"
else
  info "Version: $VERSION"
fi

# status is "passed" or "failed"
STATUS=$(jq -r '.status // empty' "$JSON_FILE")
case "$STATUS" in
  passed|failed)
    info "Status: $STATUS"
    ;;
  *)
    error "Invalid status: '$STATUS' (expected 'passed' or 'failed')"
    ;;
esac

# title is a non-empty string
TITLE=$(jq -r '.title // empty' "$JSON_FILE")
if [ -z "$TITLE" ]; then
  error "title is empty or missing"
else
  info "Title: $TITLE"
fi

# duration_ms is a non-negative number
DURATION=$(jq '.duration_ms // -1' "$JSON_FILE")
if [ "$DURATION" -lt 0 ] 2>/dev/null; then
  error "duration_ms is negative or missing: $DURATION"
else
  info "Duration: ${DURATION}ms"
fi

# summary is a non-empty string
SUMMARY=$(jq -r '.summary // empty' "$JSON_FILE")
if [ -z "$SUMMARY" ]; then
  error "summary is empty or missing"
fi

# steps is an array
STEP_COUNT=$(jq '.steps | length' "$JSON_FILE" 2>/dev/null || echo "-1")
if [ "$STEP_COUNT" -lt 0 ] 2>/dev/null; then
  error "steps is not an array"
elif [ "$STEP_COUNT" -eq 0 ]; then
  warn "steps array is empty"
else
  info "Steps: $STEP_COUNT"
fi

# Validate each step
FAILED_STEPS=0
if [ "$STEP_COUNT" -gt 0 ]; then
for i in $(seq 0 $((STEP_COUNT - 1))); do
  STEP_TITLE=$(jq -r ".steps[$i].title // empty" "$JSON_FILE")
  STEP_STATUS=$(jq -r ".steps[$i].status // empty" "$JSON_FILE")

  if [ -z "$STEP_TITLE" ]; then
    error "Step $i: missing title"
  fi

  case "$STEP_STATUS" in
    passed|failed|skipped|not-run)
      ;;
    *)
      error "Step $i ('$STEP_TITLE'): invalid status '$STEP_STATUS' (expected passed|failed|skipped|not-run)"
      ;;
  esac

  if [ "$STEP_STATUS" = "failed" ]; then
    FAILED_STEPS=$((FAILED_STEPS + 1))
  fi
done
fi

# Consistency: status "passed" should not have failed steps
if [ "$STATUS" = "passed" ] && [ "$FAILED_STEPS" -gt 0 ]; then
  error "Status is 'passed' but $FAILED_STEPS step(s) have status 'failed'"
fi

# artifacts is an object
if ! jq -e '.artifacts | type == "object"' "$JSON_FILE" > /dev/null 2>&1; then
  error "artifacts is not an object"
fi

# Summary
echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "::error::[$SCENARIO] Validation failed with $ERRORS error(s) and $WARNINGS warning(s)"
  exit 1
else
  info "Validation passed ($WARNINGS warning(s))"
fi
