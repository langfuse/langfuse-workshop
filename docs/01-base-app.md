# 01 Base App

This checkpoint is the raw sample application: a small but visually memorable web chat that helps a family member support known parent devices.

## Sample app concept

- Known profiles:
  - Rita on iPhone
  - Klaus on Windows
  - Maya on Android
- Known tasks:
  - Bluetooth
  - Wi-Fi
  - Photos
  - Printing
  - Basic maps help

## Why this example works well

- It is practical and relatable.
- It naturally benefits from profile context.
- It has clear in-scope and out-of-scope boundaries.
- It invites tool usage without needing external APIs.

## Code shape

- `src/client`: the web UI
- `src/server/anthropic-agent.ts`: the server-side agent loop
- `src/server/tools.ts`: local tools for profile lookup and help-library search
- `src/server/support-data.ts`: profiles and step-by-step help content

## Live demo flow

1. Choose a profile.
2. Ask a practical device question.
3. Show that the agent answers with the right device context.
4. Show a clearly out-of-scope request and note that this matters later for monitoring.

## What is intentionally missing at this point

- No Langfuse UI narration yet
- No managed prompt requirement
- No dataset runs
- No evaluator setup

That keeps the starting point lightweight and easy to understand.

