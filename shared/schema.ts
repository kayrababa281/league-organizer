import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  isAdmin: boolean("is_admin").default(false).notNull(),
});
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  played: integer("played").default(0).notNull(),
  wins: integer("wins").default(0).notNull(),
  draws: integer("draws").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  goalsFor: integer("goals_for").default(0).notNull(),
  goalsAgainst: integer("goals_against").default(0).notNull(),
  points: integer("points").default(0).notNull(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  name: text("name").notNull(),
  goals: integer("goals").default(0).notNull(),
  assists: integer("assists").default(0).notNull(),
  carabagCupGoals: integer("carabag_cup_goals").default(0).notNull(),
  carabagCupAssists: integer("carabag_cup_assists").default(0).notNull(),
  aurenLigCupGoals: integer("auren_lig_cup_goals").default(0).notNull(),
  aurenLigCupAssists: integer("auren_lig_cup_assists").default(0).notNull(),
  championsLeagueGoals: integer("champions_league_goals").default(0).notNull(),
  championsLeagueAssists: integer("champions_league_assists").default(0).notNull(),
  europaLeagueGoals: integer("europa_league_goals").default(0).notNull(),
  europaLeagueAssists: integer("europa_league_assists").default(0).notNull(),
  superCupGoals: integer("super_cup_goals").default(0).notNull(),
  superCupAssists: integer("super_cup_assists").default(0).notNull(),
  top8Goals: integer("top8_goals").default(0).notNull(),
  top12Goals: integer("top12_goals").default(0).notNull(),
  top16Goals: integer("top16_goals").default(0).notNull(),
  cleanSheets: integer("clean_sheets").default(0).notNull(),
  yellowCards: integer("yellow_cards").default(0).notNull(),
  redCards: integer("red_cards").default(0).notNull(),
});

// tournament values: 'league' | 'carabag_cup' | 'auren_lig_cup' | 'champions_league' | 'europa_league' | 'super_cup'
// round values: 'group_stage' | 'round_of_16' | 'round_of_12' | 'round_of_8' | 'quarter_final' | 'semi_final' | 'final'
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  homeTeamId: integer("home_team_id").references(() => teams.id).notNull(),
  awayTeamId: integer("away_team_id").references(() => teams.id).notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  week: integer("week"),
  tournament: text("tournament").default("league").notNull(),
  round: text("round"),
  isPlayed: boolean("is_played").default(false).notNull(),
  videoUrl: text("video_url"),
  date: timestamp("date"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  senderName: text("sender_name").notNull(),
  senderAvatar: text("sender_avatar"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bannedUsers = pgTable("banned_users", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull().unique(),
  reason: text("reason"),
  bannedAt: timestamp("banned_at").defaultNow().notNull(),
});

// === SCHEMAS ===

export const insertTeamSchema = createInsertSchema(teams).omit({ 
  id: true, played: true, wins: true, draws: true, losses: true, 
  goalsFor: true, goalsAgainst: true, points: true 
});

export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, isPlayed: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, isAdmin: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, isAdmin: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type BannedUser = typeof bannedUsers.$inferSelect;

export type UpdateMatchScoreRequest = {
  homeScore: number;
  awayScore: number;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type AdminAuthResponse = {
  success: boolean;
  isAdmin: boolean;
  message?: string;
};

// Tournament and round label helpers (shared)
export const TOURNAMENT_LABELS: Record<string, string> = {
  league: "Lig",
  carabag_cup: "Carabağ Cup",
  auren_lig_cup: "Auren Lig Cup",
  champions_league: "Champions League",
  europa_league: "UEFA Avrupa Ligi",
  super_cup: "UEFA Süper Kupa",
};

export const ROUND_LABELS: Record<string, string> = {
  group_stage: "Grup Aşaması",
  round_of_16: "İlk 16",
  round_of_12: "İlk 12",
  round_of_8: "İlk 8",
  quarter_final: "Çeyrek Final",
  semi_final: "Yarı Final",
  final: "Final",
};
