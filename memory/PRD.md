# ForgeTrack — Product Requirements

## Overview
Mobile (Expo) workout-tracking app where a single trainer designs programs for multiple clients, and clients log their actual sets/reps/weight against the program.

## Roles
- **Trainer (single)**: creates clients, builds programs (Weeks → Days → Exercises), maintains exercise library with images, reviews client progress.
- **Client (many)**: views their assigned program, logs sets per exercise, sees workout history.

## Authentication
- Simple code-based login (no passwords).
- Trainer code is configured via `TRAINER_CODE` env (default `TRAINER`).
- Client codes are auto-generated 6-character alphanumeric codes when the trainer creates a client.

## Features

### Trainer
- Clients list (create with FAB; code shown after creation to share).
- Exercise library (CRUD, with optional image upload from device, stored as base64).
- Program editor per client:
  - Add/remove weeks (auto-numbered) with editable names.
  - Add/remove days inside each week with editable names (e.g. Push / Pull / Legs).
  - Add exercises to each day with target sets / target reps / target weight.
- Client detail screen with tabs:
  - **History** — workout logs grouped by week with per-week volume.
  - **Program** — quick summary + edit program shortcut.

### Client
- Program tab: accordion of weeks → days → exercises with their targets.
- Tap an exercise → Log screen:
  - Per set: weight (text input) + reps slider 1–12, with a **12+** chip that switches to a custom numeric input for higher rep counts.
  - Add/remove sets so each set can have its own weight/reps.
  - Save logs the workout against `week_number`, `day_number`, `exercise_id`.
- History tab: chronological list of past logs with computed volume.

## Data Model
- `clients(id, name, code, created_at)`
- `exercises(id, name, muscle_group, instructions, media_base64, media_type, created_at)`
- `programs(id, client_id, name, weeks[], updated_at)` where `weeks` = `[{week_number, name, days: [{day_number, name, items: [{exercise_id, target_sets, target_reps, target_weight, notes}]}]}]`
- `workout_logs(id, client_id, exercise_id, week_number, day_number, sets[{set_number,weight,reps}], completed_at)`

## API (all under `/api`)
- `POST /auth/login`
- `GET/POST/GET/DELETE /clients` (+ `/{id}`)
- `GET/POST/GET/PUT/DELETE /exercises` (+ `/{id}`)
- `GET /programs/{client_id}`, `POST /programs`
- `POST /logs`, `GET /logs/{client_id}`

## Tech Stack
- Frontend: Expo Router (SDK 54), React Native, expo-image, expo-image-picker, @react-native-community/slider
- Backend: FastAPI + Motor + MongoDB
- Storage: AsyncStorage (session)
