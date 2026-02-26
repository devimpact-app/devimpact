# DevImpact

DevImpact is a TypeScript and Postgres-based developer activity platform that ingests calendar and GitHub data, organizes work into structured buckets, and generates narrative summaries for weekly reviews and meeting prep.

## What It Does

DevImpact connects to external developer tools and transforms raw activity into structured, reviewable insight:

- Ingests GitHub and calendar events
- Normalizes and stores activity in Postgres
- Groups events into "work buckets"
- Generates weekly work summaries
- Produces structured meeting prep for 1:1s and standups
- Exposes a full activity timeline across systems

## System Overview

The system follows a pipeline model:

External APIs → Normalized Activity Store → Work Bucketing → Aggregations → Narrative Summaries → API + UI

The design emphasizes:
- Idempotent ingestion
- Safe background reprocessing
- Schema clarity
- Observable job execution

## Activity Ingestion

GitHub and calendar events are fetched and normalized into structured activity tables. 

Ingestion jobs are:
- Retry-safe and idempotent
- Designed for partial failure handling
- Re-runnable for backfills and schema evolution

## Weekly Summaries and Meeting Prep

From structured buckets, the system generates:

- Weekly summaries of completed work
- Standup-ready bullet points
- 1:1 preparation notes
- A chronological activity timeline

Summaries are derived from structured activity rather than raw event streams, ensuring coherence and reducing duplication.

## Tech Stack

- TypeScript (API + frontend)
- Postgres
- Background cron job workers
- Structured logging
