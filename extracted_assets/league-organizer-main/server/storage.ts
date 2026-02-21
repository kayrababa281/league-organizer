import { db } from "./db";
import {
  teams, players, matches, messages, bannedUsers, users,
  type Team, type InsertTeam,
  type Player, type InsertPlayer,
  type Match, type InsertMatch,
  type Message, type InsertMessage,
  type BannedUser, type User, type InsertUser
} from "@shared/schema";
import { eq, desc, asc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Teams
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  deleteTeam(id: number): Promise<void>;
  updateTeamStats(id: number, stats: Partial<Team>): Promise<Team>;

  // Players
  getPlayers(): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, updates: Partial<Player>): Promise<Player>;
  deletePlayer(id: number): Promise<void>;

  // Matches
  getMatches(): Promise<Match[]>;
  getMatch(id: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, updates: Partial<Match>): Promise<Match>;
  deleteMatch(id: number): Promise<void>;

  // Chat
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  
  // Ban system
  banUser(identifier: string, reason?: string): Promise<BannedUser>;
  isBanned(identifier: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isAdmin, false));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(desc(teams.points), desc(teams.goalsFor)); // Simplified sort, more logic in route if needed
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async deleteTeam(id: number): Promise<void> {
    // Cascade delete would be better in DB, but for now manual cleanup if needed
    // Assuming simple delete
    await db.delete(players).where(eq(players.teamId, id));
    await db.delete(matches).where(eq(matches.homeTeamId, id));
    await db.delete(matches).where(eq(matches.awayTeamId, id));
    await db.delete(teams).where(eq(teams.id, id));
  }

  async updateTeam(id: number, updates: Partial<Team>): Promise<Team> {
    const [updated] = await db.update(teams).set(updates).where(eq(teams.id, id)).returning();
    return updated;
  }

  async updateTeamStats(id: number, stats: Partial<Team>): Promise<Team> {
    const [updated] = await db.update(teams).set(stats).where(eq(teams.id, id)).returning();
    return updated;
  }

  // Players
  async getPlayers(): Promise<Player[]> {
    return await db.select().from(players);
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db.insert(players).values(player).returning();
    return newPlayer;
  }

  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player> {
    const [updated] = await db.update(players).set(updates).where(eq(players.id, id)).returning();
    return updated;
  }

  async deletePlayer(id: number): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }

  // Matches
  async getMatches(): Promise<Match[]> {
    return await db.select().from(matches).orderBy(asc(matches.week), asc(matches.id));
  }

  async getMatch(id: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }

  async updateMatch(id: number, updates: Partial<Match>): Promise<Match> {
    const [updated] = await db.update(matches).set(updates).where(eq(matches.id, id)).returning();
    return updated;
  }

  async deleteMatch(id: number): Promise<void> {
    await db.delete(matches).where(eq(matches.id, id));
  }

  // Chat
  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(asc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  // Ban
  async banUser(identifier: string, reason?: string): Promise<BannedUser> {
    const [ban] = await db.insert(bannedUsers).values({ identifier, reason }).returning();
    return ban;
  }

  async isBanned(identifier: string): Promise<boolean> {
    const [ban] = await db.select().from(bannedUsers).where(eq(bannedUsers.identifier, identifier));
    return !!ban;
  }
}

export const storage = new DatabaseStorage();
