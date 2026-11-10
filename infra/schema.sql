-- Run once through api/scripts/migrate.mjs before enabling the public API.
IF OBJECT_ID('dbo.rounds','U') IS NULL
BEGIN
 CREATE TABLE dbo.rounds(
  id uniqueidentifier NOT NULL PRIMARY KEY,
  player uniqueidentifier NOT NULL,
  game varchar(10) NOT NULL CHECK(game IN('marble','lights')),
  started bigint NOT NULL,
  finished bit NOT NULL CONSTRAINT DF_rounds_finished DEFAULT(0),
  remaining_count int NULL,
  moves int NULL,
  seconds int NULL
 );
 CREATE INDEX IX_rounds_player_started ON dbo.rounds(player,started DESC);
 CREATE INDEX IX_rounds_leaderboard ON dbo.rounds(game,finished,player,remaining_count,moves,seconds);
END;

-- Additive migration: existing scores keep their anonymous label.
IF COL_LENGTH('dbo.rounds','display_name') IS NULL
 ALTER TABLE dbo.rounds ADD display_name nvarchar(24) NULL;

-- Short-lived anonymous activity only; never store names or a player history.
IF OBJECT_ID('dbo.player_activity','U') IS NULL
BEGIN
 CREATE TABLE dbo.player_activity(
  player uniqueidentifier NOT NULL PRIMARY KEY,
  last_seen bigint NOT NULL
 );
END;
IF DATABASE_PRINCIPAL_ID('qm_app') IS NOT NULL
 GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.player_activity TO qm_app;

-- Sudoku keeps one resumable streak per player and only the top 100 best scores.
IF OBJECT_ID('dbo.sudoku_sessions','U') IS NULL
 CREATE TABLE dbo.sudoku_sessions(
  id uniqueidentifier NOT NULL PRIMARY KEY,
  player uniqueidentifier NOT NULL UNIQUE,
  state nvarchar(max) NOT NULL,
  updated bigint NOT NULL
 );
IF OBJECT_ID('dbo.sudoku_scores','U') IS NULL
 CREATE TABLE dbo.sudoku_scores(
  player uniqueidentifier NOT NULL PRIMARY KEY,
  name nvarchar(24) NOT NULL,
  wins int NOT NULL,
  seconds int NOT NULL,
  start_level int NOT NULL
 );
IF DATABASE_PRINCIPAL_ID('qm_app') IS NOT NULL
BEGIN
 GRANT SELECT,INSERT,UPDATE,DELETE ON dbo.sudoku_sessions TO qm_app;
 GRANT SELECT,INSERT,UPDATE,DELETE ON dbo.sudoku_scores TO qm_app;
END;
