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
