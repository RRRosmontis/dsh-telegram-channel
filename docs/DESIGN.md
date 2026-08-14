# Design: Telegram remote control for live DSH sessions

Date: 2026-08-14  
Status: Approved (ship MVP)

## Goal

Phone Telegram remote-controls **live** DeepSeek Harness agents in the same `dsh web` process (Codex-style). Web session is source of truth; Telegram attaches — does **not** create parallel agents.

## MVP

- Auth allowlist + long poll
- `/sessions` lists `ctx.agents.list()` / `roots()` with inline keyboard
- Bind chat → live `Agent`; plain text → `agent.followup`
- Mirror `session/event` (`turn/start`, `assistant/message`) to all Telegram chats bound to that session id
- `/unbind` clears binding only (never dispose host agent)
- Empty live list → prompt to open a Web conversation first

## Non-goals (later)

- Disk resume / history search
- Auto-create parallel agents
- Streaming edit-in-place, media, webhook

## Binding rules

- One Telegram chat → at most one bound agent; re-select replaces
- Multiple chats may bind the same live agent (all receive mirrors)
- On `stop()`: clear bindings only; do not dispose live agents
