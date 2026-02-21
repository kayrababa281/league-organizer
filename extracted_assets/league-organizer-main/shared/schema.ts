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

// Teams table - stores team info and cached stats for the league table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"), // Optional logo
  played: integer("played").default(0).notNull(),
  wins: integer("wins").default(0).notNull(),
  draws: integer("draws").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  goalsFor: integer("goals_for").default(0).notNull(),
  goalsAgainst: integer("goals_against").default(0).notNull(),
  points: integer("points").default(0).notNull(),
});

// Players table - for manual stats (goals, assists, cards, etc.)
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  name: text("name").notNull(),
  goals: integer("goals").default(0).notNull(),
  assists: integer("assists").default(0).notNull(),
  cleanSheets: integer("clean_sheets").default(0).notNull(),
  yellowCards: integer("yellow_cards").default(0).notNull(),
  redCards: integer("red_cards").default(0).notNull(),
});

// Matches/Fixtures table
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  homeTeamId: integer("home_team_id").references(() => teams.id).notNull(),
  awayTeamId: integer("away_team_id").references(() => teams.id).notNull(),
  homeScore: integer("home_score"), // Null means not played yet
  awayScore: integer("away_score"), // Null means not played yet
  week: integer("week").notNull(), // Match week/round
  isPlayed: boolean("is_played").default(false).notNull(),
  videoUrl: text("video_url"), // For match recordings/links
  date: timestamp("date"),
});

// Chat messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  senderName: text("sender_name").notNull(), // "Anonymous X" or "Kralbaba12"
  senderAvatar: text("sender_avatar"), // Profil fotoğrafı
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Banned users (simple IP or session based ban)
export const bannedUsers = pgTable("banned_users", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull().unique(), // IP or session ID
  reason: text("reason"),
  bannedAt: timestamp("banned_at").defaultNow().notNull(),
});

// === SCHEMAS ===

export const insertTeamSchema = createInsertSchema(teams).omit({ 
  id: true, 
  played: true, 
  wins: true, 
  draws: true, 
  losses: true, 
  goalsFor: true, 
  goalsAgainst: true, 
  points: true 
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

// Request Types
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
