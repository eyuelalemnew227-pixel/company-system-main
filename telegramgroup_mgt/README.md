# Kaldis Telegram Communication MVP

This repository implements the proposal in `Kaldis_Telegram_Communication_Proposal_Short.docx` as a PHP Telegram bot service.

## What it does

- Tracks branch communication in Region 1 and Region 2 Telegram groups.
- Binds forum topics to departments in both regional groups and the Head Office group.
- Registers branch managers, regional managers, department heads, and the operations director.
- Adds a `Forward to HO` action for regional communications.
- Routes forwarded messages into the correct Head Office topic.
- Notifies the regional manager when a department head responds.
- Stores a basic communication record in SQLite.

## Project layout

- `src/` PHP service classes and bot runtime
- `bin/kaldis-bot.php` CLI entrypoint
- `tests/run.php` PHP smoke tests
- `config.example.json` example runtime configuration

## Requirements

- PHP 8.3+
- PDO SQLite extension
- `allow_url_fopen` enabled, or you can switch the Telegram client to cURL if preferred later

## Setup

1. Copy `config.example.json` to `config.json`.
2. Fill in your Telegram bot token, chat IDs, and operations director user ID.
3. Create the regional and Head Office groups in Telegram and enable Topics.
4. Add the bot to each group and allow it to read messages.
5. Inside each topic, run the bind command:

```text
/bind_topic "Topic Name" "Department"
```

Example:

```text
/bind_topic "Suggestions & Improvements" "Operations"
```

6. Register users in private chat with the bot:

```text
/register_manager "Region 1"
/register_branch "Region 1" "Kaldis Bole"
/register_head "HR"
/register_director
```

## Run Bot Daemon

```bash
php bin/kaldis-bot.php --config config.json
```

## Admin Panel Dashboard

Run the Admin Dashboard web server:

```bash
php bin/run-admin.php --port=8000
```
or
```bash
php -S localhost:8000 -t public
```

Open `http://localhost:8000` in your web browser to access:
- **System Overview**: Live stats (total messages, recorded, forwarded to HO, responded, active users, topic bindings).
- **Communications Tracker**: Real-time search, region/status filtering, and status updates.
- **User Roster**: Manage branch managers, regional managers, department heads, and directors.
- **Topic Bindings**: View and manage group thread ID to department mappings.
- **Bot Configuration**: Live editor for group IDs, bot token, and runtime settings.

## Test

```bash
php tests/run.php
```

## Notes

- The bot uses Telegram forum topic thread IDs, so each topic must be bound once with `/bind_topic`.
- Department routing uses the proposal's topic structure and treats `Announcements` and `Suggestions & Improvements` as Operations-related by default.
- This is an MVP scaffold, ready for deployment and iterative hardening.

