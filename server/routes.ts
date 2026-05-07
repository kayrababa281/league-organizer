import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import { eq, desc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import OpenAI from "openai";
import { db } from "./db";
import { aiConversations, aiMessages } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const AUREN_AI_SYSTEM_PROMPT = `Sen "Auren AI" - Auren Lig futbol lig yönetim sisteminin efsane yapay zeka asistanısın.

Auren Lig hakkında bilgilerin:
- Türkçe bir futbol ligi yönetim sistemidir
- Turnuvalar: Lig, Carabağ Cup, Auren Lig Cup, Champions League, UEFA Avrupa Ligi, UEFA Süper Kupa
- Her turnuvada Gol Krallığı ve Asist Krallığı takip edilmektedir
- Admin panelinden takım, oyuncu ve maç yönetimi yapılabilir
- Sohbet odası ve banlama sistemi mevcuttur

Görevlerin:
- Adminle Türkçe konuş
- Lig yönetimi, futbol taktikleri, istatistik analizi konularında uzman yardım ver
- Maç sonuçlarını analiz et, önerilerde bulun
- Her türlü soruya zeki ve detaylı cevaplar ver
- Kodlama, tasarım, strateji ne isterlerse yap
- Cevaplarında Markdown formatını kullan (başlıklar, listeler, **kalın**)

Sen sadece admin için çalışıyorsun. Ultra gelişmiş, efsane bir AI asistansın.`;;

const storage_multer = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    isAdmin: boolean;
    anonymousId?: number; // 1, 2, 3...
    identifier: string; // IP or unique ID
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve uploads statically
  app.use('/uploads', express.static('uploads'));
  
  // File upload route
  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });
  
  // Session setup
  const SessionStore = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'auren-league-secret',
    resave: false,
    saveUninitialized: true,
    store: new SessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: { maxAge: 86400000 }
  }));

  // Middleware to assign session identity
  let nextAnonymousId = 1;
  app.use(async (req, res, next) => {
    if (!req.session.anonymousId) {
      req.session.anonymousId = nextAnonymousId++;
    }
    if (!req.session.identifier) {
      req.session.identifier = req.ip || `session-${req.session.id}`;
    }
    if (req.session.isAdmin !== true) {
      req.session.isAdmin = false;
    }

    const isBanned = await storage.isBanned(req.session.identifier!);
    if (isBanned && req.path.startsWith('/api/messages') && req.method === 'POST') {
      return res.status(403).json({ message: "Sohbetten yasaklandınız." });
    }

    next();
  });

  // Auth Routes
  app.post("/api/register", async (req, res) => {
    const { username, password, avatarUrl, bio, answer, num1, num2 } = req.body;
    
    // Admin username protection
    if (username.toLowerCase() === "kralbaba12") {
      return res.status(400).json({ message: "Bu kullanıcı adı kullanılamaz." });
    }
    
    // Math validation
    if (parseInt(answer) !== num1 + num2) {
      return res.status(400).json({ message: "Matematik sorusu cevabı yanlış!" });
    }

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Bu kullanıcı adı zaten alınmış." });
    }

    const user = await storage.createUser({ username, password, avatarUrl, bio });
    req.session.userId = user.id;
    req.session.isAdmin = user.username === "Kralbaba12";
    res.status(201).json(user);
  });

  app.post(api.auth.login.path, async (req, res) => {
    const { username, password } = req.body;
    
    // Hardcoded admin check for legacy support
    if (username === "Kralbaba12" && password === "Admin2026") {
      req.session.isAdmin = true;
      return res.json({ success: true, isAdmin: true });
    }

    const user = await storage.getUserByUsername(username);
    if (user && user.password === password) {
      req.session.userId = user.id;
      req.session.isAdmin = user.isAdmin || user.username === "Kralbaba12";
      res.json({ success: true, isAdmin: req.session.isAdmin });
    } else {
      res.status(401).json({ message: "Hatalı kullanıcı adı veya şifre" });
    }
  });

  app.get(api.auth.check.path, async (req, res) => {
    let name = `Anonymous ${req.session.anonymousId || '?'}`;
    if (req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) name = user.username;
    } else if (req.session.isAdmin && !req.session.userId) {
      name = "Kralbaba12";
    }

    res.json({ 
      isAdmin: req.session.isAdmin === true,
      identifier: name,
      userId: req.session.userId
    });
  });

  // Teams
  app.get(api.teams.list.path, async (req, res) => {
    const teams = await storage.getTeams();
    // Sort logic: Points > Goal Difference (GF-GA) > Goals For
    teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });
    res.json(teams);
  });

  app.post(api.teams.create.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    const team = await storage.createTeam(req.body);
    res.status(201).json(team);
  });

  app.delete(api.teams.delete.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    await storage.deleteTeam(Number(req.params.id));
    res.status(204).send();
  });

  app.put(api.teams.update.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    const team = await storage.updateTeam(Number(req.params.id), req.body);
    res.json(team);
  });

  // Players
  app.get(api.players.list.path, async (req, res) => {
    const players = await storage.getPlayers();
    res.json(players);
  });

  app.post(api.players.create.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    const player = await storage.createPlayer(req.body);
    res.status(201).json(player);
  });

  app.put(api.players.update.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    const player = await storage.updatePlayer(Number(req.params.id), req.body);
    res.json(player);
  });

  // User Management
  app.get("/api/admin/users", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    const users = await storage.getUsers();
    res.json(users);
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    const user = await storage.updateUser(Number(req.params.id), req.body);
    res.json(user);
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    await storage.deleteUser(Number(req.params.id));
    res.status(204).send();
  });

  app.post(api.auth.logout.path, async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });

  app.delete(api.players.delete.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    await storage.deletePlayer(Number(req.params.id));
    res.status(204).send();
  });

  // Matches
  app.get(api.matches.list.path, async (req, res) => {
    const matches = await storage.getMatches();
    res.json(matches);
  });

  app.post(api.matches.create.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    const match = await storage.createMatch(req.body);
    res.status(201).json(match);
  });

  app.delete(api.matches.delete.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    await storage.deleteMatch(Number(req.params.id));
    // Recalculate ALL stats to ensure consistency
    await recalculateLeagueTable();
    res.status(204).send();
  });

  app.patch(api.matches.updateScore.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    
    const { homeScore, awayScore, videoUrl } = req.body;
    
    // Update match
    const match = await storage.updateMatch(Number(req.params.id), {
      homeScore,
      awayScore,
      videoUrl,
      isPlayed: true
    });

    // Recalculate ALL stats to ensure consistency
    await recalculateLeagueTable();

    res.json(match);
  });

  // Chat
  app.get(api.chat.list.path, async (req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.post(api.chat.send.path, async (req, res) => {
    const { content } = req.body;
    let senderName = `Anonymous ${req.session.anonymousId}`;
    let senderAvatar = null;
    
    if (req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        senderName = user.username;
        senderAvatar = user.avatarUrl;
      }
    } else if (req.session.isAdmin) {
      senderName = "Kralbaba12";
      senderAvatar = "/uploads/admin-avatar.png"; // Varsayılan admin avatarı veya null
    }
    
    const message = await storage.createMessage({
      content,
      senderName,
      senderAvatar,
      isAdmin: req.session.isAdmin === true,
    });
    res.status(201).json(message);
  });

  app.delete(api.chat.delete.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    await storage.deleteMessage(Number(req.params.id));
    res.status(204).send();
  });

  app.post(api.chat.ban.path, async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    const { identifier } = req.body;
    await storage.banUser(identifier, "Admin tarafından yasaklandı");
    res.status(201).send();
  });


  // Helper to recalculate all stats
  async function recalculateLeagueTable() {
    const teams = await storage.getTeams();
    const matches = await storage.getMatches();

    // Reset stats
    const statsMap = new Map();
    for (const team of teams) {
      statsMap.set(team.id, {
        played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0
      });
    }

    // Process only LEAGUE matches (cups don't count toward league table)
    for (const match of matches) {
      if (match.tournament !== "league") continue;
      if (!match.isPlayed || match.homeScore === null || match.awayScore === null) continue;

      const homeStats = statsMap.get(match.homeTeamId);
      const awayStats = statsMap.get(match.awayTeamId);

      if (!homeStats || !awayStats) continue;

      homeStats.played++;
      awayStats.played++;

      homeStats.goalsFor += match.homeScore;
      homeStats.goalsAgainst += match.awayScore;
      
      awayStats.goalsFor += match.awayScore;
      awayStats.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        homeStats.wins++;
        homeStats.points += 3;
        awayStats.losses++;
      } else if (match.homeScore < match.awayScore) {
        awayStats.wins++;
        awayStats.points += 3;
        homeStats.losses++;
      } else {
        homeStats.draws++;
        homeStats.points += 1;
        awayStats.draws++;
        awayStats.points += 1;
      }
    }

    // Update DB
    for (const team of teams) {
      const stats = statsMap.get(team.id);
      await storage.updateTeamStats(team.id, stats);
    }
  }

  // ===== AUREN AI ROUTES (Admin only) =====

  // Get all AI conversations
  app.get("/api/ai/conversations", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Yetkisiz erişim." });
    const convs = await db.select().from(aiConversations).orderBy(desc(aiConversations.updatedAt));
    res.json(convs);
  });

  // Create new conversation
  app.post("/api/ai/conversations", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Yetkisiz erişim." });
    const { title } = req.body;
    const [conv] = await db.insert(aiConversations).values({ title: title || "Yeni Sohbet" }).returning();
    res.status(201).json(conv);
  });

  // Delete a conversation
  app.delete("/api/ai/conversations/:id", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Yetkisiz erişim." });
    const id = parseInt(req.params.id);
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, id));
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
    res.status(204).send();
  });

  // Get messages in a conversation
  app.get("/api/ai/conversations/:id/messages", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Yetkisiz erişim." });
    const id = parseInt(req.params.id);
    const msgs = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, id)).orderBy(aiMessages.createdAt);
    res.json(msgs);
  });

  // Send a message (streaming)
  app.post("/api/ai/conversations/:id/messages", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Yetkisiz erişim." });
    const conversationId = parseInt(req.params.id);
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Mesaj boş olamaz." });

    // Save user message
    await db.insert(aiMessages).values({ conversationId, role: "user", content });

    // Get conversation history
    const history = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId)).orderBy(aiMessages.createdAt);
    const chatMessages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Update conversation updatedAt & title if first message
    if (history.length === 1) {
      const shortTitle = content.length > 40 ? content.slice(0, 40) + "…" : content;
      await db.update(aiConversations).set({ title: shortTitle, updatedAt: new Date() }).where(eq(aiConversations.id, conversationId));
    } else {
      await db.update(aiConversations).set({ updatedAt: new Date() }).where(eq(aiConversations.id, conversationId));
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";
    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [{ role: "system", content: AUREN_AI_SYSTEM_PROMPT }, ...chatMessages],
        stream: true,
        max_completion_tokens: 4096,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: "AI hatası oluştu." })}\n\n`);
      res.end();
      return;
    }

    // Save assistant message
    await db.insert(aiMessages).values({ conversationId, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  });

  // Seed data function (removed seed content to avoid fake stats)
  async function seed() {
    // No fake data as per user request
  }

  await seed();

  return httpServer;
}
