# ScreenPact

ScreenPact is a screen-time accountability app that turns daily device usage into a private, group-friendly leaderboard. It combines a React web experience, an Express API, Supabase persistence, session-based authentication, and an Android UsageStatsManager collector.

> This repository is an active prototype. The Android collector currently supports pairing, permission reporting, manual daily sync, and sync heartbeats. Background WorkManager scheduling, offline queueing, and retry telemetry are not implemented yet.

## Frontend Preview

Here are some screenshots of the ScreenPact frontend, showcasing the app's user interface and key screens.

<p align="center">
  <img width="420" src="https://github.com/user-attachments/assets/4aa80f5d-13e5-480e-9334-8b1aef56d782" alt="ScreenPact frontend screenshot 1" />
  <img width="420" src="https://github.com/user-attachments/assets/937fba61-a62d-4691-842e-9c12b2604381" alt="ScreenPact frontend screenshot 2" />
</p>

<p align="center">
  <img width="420" src="https://github.com/user-attachments/assets/b795773b-f3d6-452c-a835-e6513fd966b9" alt="ScreenPact frontend screenshot 3" />
  <img width="420" src="https://github.com/user-attachments/assets/497fb31f-58c8-4eb3-89c2-9ca9b577ad0f" alt="ScreenPact frontend screenshot 4" />
</p>

## Product Idea

ScreenPact helps people reduce screen time through accountability instead of isolation. It collects a daily summary of device usage, compares progress inside private groups, ranks members by lower screen time, and lets each person set a personal goal.
