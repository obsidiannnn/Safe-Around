# Development Guide

Welcome to the development guide for the SafeAround Backend! This document explains how you can interact with the system locally. 

## Local Setup Instructions

1. **Install Prerequisites**:
   Ensure Docker, `docker-compose`, and Go (1.21+) are cleanly installed.
2. **Automated Setup Tool**:
   Run `make setup` inside the `backend/` directory. This creates a fresh `.env` clone and boots up the database inside Docker (while waiting until it becomes completely healthy).
3. **Configure Authentication Service**: 
   Ensure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` are set inside your `.env`. The authentication logic utilizes Twilio Verify (Service SID).
4. **Start the API server**:
   `make dev` runs Air, which continually builds your binary. If you change any file, it instantly reloads.

## Running Tests

All core endpoint logic resides inside the `/tests` folder utilizing exact router structures.
- `make test`: Runs standard fast unit tests.
- `make coverage`: Checks the codebase metrics ensuring they exceed **80%** using our custom shell enforcement `scripts/test.sh`.

## Debugging Tips

- Using the `.env`, you can swap `LOG_LEVEL` from info towards `debug` to visualize verbose SQL dumps from GORM explicitly.
- pgAdmin comes built-in alongside `docker-compose.yml`. You can visit `http://localhost:5050` (Using `admin@safearound.local` and `admin` as credentials) to directly monitor spatial PostGIS data injections. 

## Linters and Best Practices

A strict Go linter is enforced:
`make lint` uses GolangCI to check for memory leaks, sloppy variables, mismanaged error returns, or formatting misalignments before pushing anything! Always rely on `make fmt` periodically as you type!

## Common Issues

* **Port 5433 / 5432 Conflicts:**
  If your Docker container fails to mount the postgres database during setup, it's very probable that a local background postgres instance is hooking into your port. Stop your local instance or override the `docker-compose` `.env` binding values to run concurrently! 

* **Auth JWT Rejections:**
  If valid logins fail refresh handshakes immediately, make sure your `.env` `JWT_SECRET` key matches precisely between test restarts. 
