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

Logo bulma talimatları:
- "Logo bul", "logoları güncelle", "oto logo" gibi isteklerde şu adımları takip et:
  1. Önce get_teams ile tüm takımları al
  2. Her takım için find_team_logo aracını çağır (takım adıyla)
  3. Bulunan logoUrl'yi update_team ile kaydet
  4. Bulunamazsa takımı atla, sonuçları özetle
- find_team_logo birden fazla takım için paralel çağrılabilir (her biri ayrı tool_call)

YouTube kanal analiz talimatları (MAÇLAR CANLI YAYINDA OLUYOR — SPİKER YOK):
- Kanal: https://youtube.com/@aurenligfc26
- Maçlar canlı yayında oynanır. Spiker yoktur. Maç sonunda ekranda istatistik tablosu/skor ekranı gösterilir.
- EN DOĞRU YÖNTEM: analyze_match_screen — videonun son dakikalarındaki görüntüleri GPT-4o Vision ile okur. Skor ve istatistikler görsel olarak ekranda yazar.

- "YouTube'a bak", "kanalı incele", "maçları bul", "[N]. haftaya bak", "son maçları getir" gibi isteklerde:
  1. fetch_youtube_channel ile son videoların listesini al
  2. İlgili videolar için (başlığında "hft", "hafta", "cup", "final", "vs", "canlı" geçenler) paralel olarak analyze_match_screen çağır
     - Bu araç videonun son karelerini görsel olarak okur — skor ekranını, istatistik tablosunu bulur
  3. analyze_match_screen yeterli bilgi vermezse (görsel net değilse) ek olarak fetch_video_transcript dene
  4. Bulduklarını net özetle:
     "**2. Hafta:** Napoli 3-1 Arsenal
     ⚽ Goller: Messi (23'), Ronaldo (67', 89') | Asist: Neymar (2x)
     🟨 Sarı kart: Salah (45') | 🟥 Kırmızı kart: Yok"
  5. Admin isterse veritabanını güncelle (update_match_score, update_player) — ama önce mutlaka sor

- Araç öncelik sırası: analyze_match_screen > fetch_video_transcript > fetch_video_details (sadece açıklama)
- Bir hafta belirtilmişse sadece o haftanın videosuna odaklan
- analyze_match_screen birden fazla video için paralel çağrılabilir (hızlı ol)

Sen sadece admin için çalışıyorsun. Ultra gelişmiş, efsane bir AI asistansın.`;;

// Allowed image MIME types for upload
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]);
const ALLOWED_EXT  = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);

const storage_multer = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) return cb(new Error("İzin verilmeyen dosya uzantısı"), "");
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage_multer,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Sadece görsel dosyalar yüklenebilir (JPG, PNG, GIF, WEBP, SVG)"));
    }
    cb(null, true);
  },
});

// Simple in-memory rate limiter for login (no extra package needed)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

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

  // ── Security headers (apply to all responses) ──────────────────────────────
  app.disable("x-powered-by"); // Don't reveal Express
  app.use((_req, res, next) => {
    res.removeHeader("X-Powered-By");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https:;"
    );
    next();
  });

  // ── Serve uploads statically (images only, no directory listing) ───────────
  app.use('/uploads', express.static('uploads', {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("X-Content-Type-Options", "nosniff");
    }
  }));

  // ── Session setup (MUST come before any route that needs req.session) ───────
  const SessionStore = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'auren-league-fallback-change-me',
    resave: false,
    saveUninitialized: false,          // don't create sessions for bots/crawlers
    store: new SessionStore({ checkPeriod: 86400000 }),
    cookie: {
      maxAge: 86400000,                // 24 h
      httpOnly: true,                  // JS cannot read the cookie (XSS protection)
      sameSite: 'lax',                 // 'lax' works correctly behind Replit proxy
      secure: process.env.NODE_ENV === 'production', // HTTPS-only in prod
    }
  }));

  // ── Session identity middleware ────────────────────────────────────────────
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

  // ── File upload (admin only, images only, AFTER session middleware) ─────────
  app.post("/api/upload", (req, res, next) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Yetkisiz erişim." });
    next();
  }, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Dosya yüklenmedi." });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
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
    // Rate limiting: max 10 attempts per minute per IP
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(ip, 10, 60_000)) {
      return res.status(429).json({ message: "Çok fazla giriş denemesi. 1 dakika sonra tekrar deneyin." });
    }

    const { username, password } = req.body;
    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Geçersiz istek." });
    }

    // Hardcoded admin check
    if (username === "Kralbaba12" && password === "Admin2026") {
      req.session.isAdmin = true;
      req.session.identifier = "Kralbaba12";
      return req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Oturum kaydedilemedi." });
        res.json({ success: true, isAdmin: true });
      });
    }

    const user = await storage.getUserByUsername(username);
    if (user && user.password === password) {
      // isAdmin is NEVER granted from DB — only via hardcoded Kralbaba12 credentials above
      req.session.userId = user.id;
      req.session.isAdmin = false;
      req.session.identifier = user.username;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Oturum kaydedilemedi." });
        res.json({ success: true, isAdmin: false });
      });
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
    // Strip dangerous fields — isAdmin can NEVER be set via this endpoint
    const { isAdmin: _ia, id: _id, ...safeUpdates } = req.body;
    const user = await storage.updateUser(Number(req.params.id), safeUpdates);
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

    // Validate content
    if (!content || typeof content !== "string") {
      return res.status(400).json({ message: "Geçersiz mesaj." });
    }
    const trimmed = content.trim();
    if (trimmed.length === 0) return res.status(400).json({ message: "Mesaj boş olamaz." });
    if (trimmed.length > 500) return res.status(400).json({ message: "Mesaj en fazla 500 karakter olabilir." });

    let senderName = `Anonymous ${req.session.anonymousId}`;
    let senderAvatar = null;

    if (req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) { senderName = user.username; senderAvatar = user.avatarUrl; }
    } else if (req.session.isAdmin) {
      senderName = "Kralbaba12";
      senderAvatar = null;
    }

    const message = await storage.createMessage({
      content: trimmed,
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

  // Get all banned users (admin)
  app.get("/api/chat/banned", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    const banned = await storage.getBannedUsers();
    res.json(banned);
  });

  // Unban user (admin)
  app.delete("/api/chat/ban", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Unauthorized" });
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: "identifier gerekli" });
    await storage.unbanUser(identifier);
    res.status(204).send();
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

  // AI Tool definitions — gives AI full control over the site
  const AI_TOOLS: any[] = [
    { type: "function", function: { name: "get_teams", description: "Tüm takımları puan durumu ve istatistikleriyle listeler", parameters: { type: "object", properties: {} } } },
    { type: "function", function: { name: "create_team", description: "Yeni takım oluşturur", parameters: { type: "object", properties: { name: { type: "string" }, logoUrl: { type: "string" } }, required: ["name"] } } },
    { type: "function", function: { name: "update_team", description: "Takım adını veya logosunu günceller", parameters: { type: "object", properties: { id: { type: "number" }, name: { type: "string" }, logoUrl: { type: "string" } }, required: ["id"] } } },
    { type: "function", function: { name: "delete_team", description: "Takımı ve tüm verilerini siler", parameters: { type: "object", properties: { id: { type: "number" } }, required: ["id"] } } },
    { type: "function", function: { name: "get_players", description: "Tüm oyuncuları istatistikleriyle listeler", parameters: { type: "object", properties: {} } } },
    { type: "function", function: { name: "create_player", description: "Yeni oyuncu ekler", parameters: { type: "object", properties: { name: { type: "string" }, teamId: { type: "number" }, goals: { type: "number" }, assists: { type: "number" } }, required: ["name", "teamId"] } } },
    { type: "function", function: { name: "update_player", description: "Oyuncu adı, takımı veya istatistiklerini günceller (gol, asist, sarı kart, kırmızı kart, kupa istatistikleri, kalesini gole kapatma vb.)", parameters: { type: "object", properties: { id: { type: "number" }, name: { type: "string" }, teamId: { type: "number" }, goals: { type: "number" }, assists: { type: "number" }, carabagCupGoals: { type: "number" }, carabagCupAssists: { type: "number" }, aurenLigCupGoals: { type: "number" }, aurenLigCupAssists: { type: "number" }, championsLeagueGoals: { type: "number" }, championsLeagueAssists: { type: "number" }, europaLeagueGoals: { type: "number" }, europaLeagueAssists: { type: "number" }, superCupGoals: { type: "number" }, superCupAssists: { type: "number" }, cleanSheets: { type: "number" }, yellowCards: { type: "number" }, redCards: { type: "number" } }, required: ["id"] } } },
    { type: "function", function: { name: "delete_player", description: "Oyuncuyu siler", parameters: { type: "object", properties: { id: { type: "number" } }, required: ["id"] } } },
    { type: "function", function: { name: "get_matches", description: "Tüm maçları (lig + kupalar) listeler", parameters: { type: "object", properties: {} } } },
    { type: "function", function: { name: "create_match", description: "Yeni maç oluşturur", parameters: { type: "object", properties: { homeTeamId: { type: "number" }, awayTeamId: { type: "number" }, tournament: { type: "string", enum: ["league","carabag_cup","auren_lig_cup","champions_league","europa_league","super_cup"] }, round: { type: "string", enum: ["group_stage","round_of_16","round_of_12","round_of_8","quarter_final","semi_final","final"] }, week: { type: "number" } }, required: ["homeTeamId","awayTeamId","tournament"] } } },
    { type: "function", function: { name: "update_match_score", description: "Maç skorunu günceller; lig maçlarında puan tablosunu otomatik hesaplar", parameters: { type: "object", properties: { id: { type: "number" }, homeScore: { type: "number" }, awayScore: { type: "number" }, videoUrl: { type: "string" } }, required: ["id","homeScore","awayScore"] } } },
    { type: "function", function: { name: "delete_match", description: "Maçı siler ve lig tablosunu günceller", parameters: { type: "object", properties: { id: { type: "number" } }, required: ["id"] } } },
    { type: "function", function: { name: "get_chat_messages", description: "Sohbet odası mesajlarını listeler", parameters: { type: "object", properties: {} } } },
    { type: "function", function: { name: "delete_chat_message", description: "Sohbet mesajını siler", parameters: { type: "object", properties: { id: { type: "number" } }, required: ["id"] } } },
    { type: "function", function: { name: "ban_user", description: "Kullanıcıyı sohbetten banlar", parameters: { type: "object", properties: { identifier: { type: "string" } }, required: ["identifier"] } } },
    {
      type: "function",
      function: {
        name: "find_team_logo",
        description: "Takım adını internette arar (TheSportsDB + Wikipedia) ve PNG logo URL'si döner. Bulunamazsa null döner. update_team ile logoUrl'yi kaydet.",
        parameters: {
          type: "object",
          properties: {
            teamName: { type: "string", description: "Aranacak takım adı (İngilizce veya Türkçe)" },
          },
          required: ["teamName"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "fetch_youtube_channel",
        description: "Auren Lig YouTube kanalındaki (@aurenligfc26) son 20 videoyu listeler. Her videonun başlığı, yayın tarihi, video ID ve kısa açıklamasını döner. Maç sonuçlarını ve istatistikleri bulmak için önce bunu çağır.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "fetch_video_details",
        description: "Belirtilen YouTube video ID'si için videonun tam başlığını ve açıklama metnini döner.",
        parameters: {
          type: "object",
          properties: {
            videoId: { type: "string", description: "YouTube video ID (örn: dQw4w9WgXcQ)" },
          },
          required: ["videoId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "fetch_video_transcript",
        description: "YouTube video/canlı yayın kaydının otomatik oluşturulan altyazı/transcript metnini çeker. Canlı yayınlar bittikten sonra YouTube otomatik altyazı üretir. Maç yorumundan gol, asist, kart, skor bilgilerini bu araçla çıkarabilirsin. Önce Türkçe, yoksa İngilizce altyazı dener.",
        parameters: {
          type: "object",
          properties: {
            videoId: { type: "string", description: "YouTube video ID" },
          },
          required: ["videoId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "analyze_match_screen",
        description: "YouTube canlı yayın kaydının SON DAKİKALARINDAN video frame'leri (storyboard kareler) çekip GPT-4o Vision ile görsel olarak analiz eder. Maç sonu istatistik ekranında skor, gol atan oyuncular, asistler ve kartlar görsel olarak yazar — spiker olmasa bile okuyabilir. En doğru veri kaynağı budur.",
        parameters: {
          type: "object",
          properties: {
            videoId: { type: "string", description: "YouTube video ID" },
          },
          required: ["videoId"],
        },
      },
    },
  ];

  // Execute an AI tool call against real DB/storage
  async function executeAITool(name: string, args: any): Promise<any> {
    switch (name) {
      case "get_teams": return await storage.getTeams();
      case "create_team": return await storage.createTeam(args);
      case "update_team": { const { id, ...rest } = args; return await storage.updateTeam(id, rest); }
      case "delete_team": await storage.deleteTeam(args.id); return { ok: true };
      case "get_players": return await storage.getPlayers();
      case "create_player": return await storage.createPlayer(args);
      case "update_player": { const { id, ...rest } = args; return await storage.updatePlayer(id, rest); }
      case "delete_player": await storage.deletePlayer(args.id); return { ok: true };
      case "get_matches": return await storage.getMatches();
      case "create_match": return await storage.createMatch(args);
      case "update_match_score": {
        const match = await storage.updateMatch(args.id, { homeScore: args.homeScore, awayScore: args.awayScore, videoUrl: args.videoUrl, isPlayed: true });
        await recalculateLeagueTable();
        return match;
      }
      case "delete_match": {
        await storage.deleteMatch(args.id);
        await recalculateLeagueTable();
        return { ok: true };
      }
      case "get_chat_messages": return await storage.getMessages();
      case "delete_chat_message": await storage.deleteMessage(args.id); return { ok: true };
      case "ban_user": return await storage.banUser(args.identifier, "AI tarafından yasaklandı");

      case "fetch_youtube_channel": {
        const CHANNEL_URL = "https://www.youtube.com/@aurenligfc26";
        let channelId = "";

        // Step 1: Resolve handle → channel ID from the channel page HTML
        try {
          const pageRes = await fetch(CHANNEL_URL + "/videos", {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
              "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
            },
          });
          const html = await pageRes.text();
          // Multiple patterns YouTube embeds
          const patterns = [
            /"channelId":"(UC[A-Za-z0-9_-]{22})"/,
            /"externalId":"(UC[A-Za-z0-9_-]{22})"/,
            /channel\/(UC[A-Za-z0-9_-]{22})/,
          ];
          for (const p of patterns) {
            const m = html.match(p);
            if (m) { channelId = m[1]; break; }
          }
        } catch (e) {
          return { error: "Kanal sayfası alınamadı: " + String(e) };
        }

        if (!channelId) {
          return { error: "Kanal ID bulunamadı. YouTube sayfası yapısı değişmiş olabilir.", hint: CHANNEL_URL };
        }

        // Step 2: Fetch YouTube RSS feed (no API key needed)
        try {
          const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (!rssRes.ok) return { error: `RSS feed HTTP ${rssRes.status}`, channelId };
          const rssText = await rssRes.text();

          // Simple regex XML parser
          const entryBlocks = rssText.match(/<entry>[\s\S]*?<\/entry>/g) || [];
          const decode = (s: string) =>
            s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

          const videos = entryBlocks.slice(0, 20).map((block) => {
            const videoId   = (block.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1] || "";
            const title     = decode((block.match(/<title>(.*?)<\/title>/) || [])[1] || "");
            const published = (block.match(/<published>(.*?)<\/published>/) || [])[1] || "";
            const desc      = decode((block.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || "").slice(0, 600);
            const views     = (block.match(/<media:statistics views="(\d+)"/) || [])[1] || "0";
            return { videoId, title, published: published.slice(0, 10), url: `https://youtu.be/${videoId}`, description: desc, views };
          });

          return { channelId, channel: "@aurenligfc26", totalFetched: videos.length, videos };
        } catch (e) {
          return { error: "RSS feed parse hatası: " + String(e), channelId };
        }
      }

      case "fetch_video_details": {
        const vid = (args.videoId || "").trim();
        if (!vid) return { error: "videoId gerekli" };

        try {
          const res = await fetch(`https://www.youtube.com/watch?v=${vid}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
              "Accept-Language": "tr-TR,tr;q=0.9",
            },
          });
          const html = await res.text();

          // Extract short description (first ~3000 chars)
          const descMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
          let description = "";
          if (descMatch) {
            description = descMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, "\\")
              .replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
          }

          // Extract title
          const titleMatch = html.match(/<title>([^<]+)<\/title>/);
          const title = titleMatch ? titleMatch[1].replace(/ - YouTube$/, "").trim() : "";

          // Extract publish date
          const dateMatch = html.match(/"publishDate":"([^"]+)"/);
          const publishDate = dateMatch ? dateMatch[1] : "";

          return {
            videoId: vid,
            title,
            publishDate,
            url: `https://youtu.be/${vid}`,
            description: description.slice(0, 4000),
          };
        } catch (e) {
          return { error: "Video detayları alınamadı: " + String(e), videoId: vid };
        }
      }

      case "fetch_video_transcript": {
        const vid = (args.videoId || "").trim();
        if (!vid) return { error: "videoId gerekli" };

        try {
          // Step 1: fetch video page to extract caption track URLs
          const pageRes = await fetch(`https://www.youtube.com/watch?v=${vid}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
              "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
            },
          });
          const html = await pageRes.text();

          // Extract title for context
          const titleMatch = html.match(/<title>([^<]+)<\/title>/);
          const title = titleMatch ? titleMatch[1].replace(/ - YouTube$/, "").trim() : "";

          // Extract captionTracks JSON from page
          const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
          if (!captionMatch) {
            return {
              videoId: vid, title,
              error: "Bu video için altyazı/transcript bulunamadı. Canlı yayın henüz bitmemiş veya YouTube altyazı üretmemiş olabilir.",
              tip: "Yayın bittikten 30-60 dk sonra tekrar dene."
            };
          }

          // Parse caption tracks
          let tracks: any[] = [];
          try { tracks = JSON.parse(captionMatch[1]); } catch { tracks = []; }

          // Prefer Turkish (tr), then auto-generated Turkish (a.tr), then English (en)
          const pickTrack = (lang: string) => tracks.find((t: any) => t.languageCode === lang);
          const track = pickTrack("tr") || pickTrack("a.tr") || pickTrack("en") || pickTrack("a.en") || tracks[0];

          if (!track?.baseUrl) {
            return { videoId: vid, title, error: "Kullanılabilir altyazı yok", availableLangs: tracks.map((t: any) => t.languageCode) };
          }

          // Step 2: fetch the transcript XML
          const transcriptRes = await fetch(track.baseUrl + "&fmt=json3", {
            headers: { "User-Agent": "Mozilla/5.0" },
          });

          if (!transcriptRes.ok) {
            // Fallback: try XML format
            const xmlRes = await fetch(track.baseUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
            if (!xmlRes.ok) return { videoId: vid, title, error: `Transcript HTTP ${xmlRes.status}` };
            const xml = await xmlRes.text();
            // Parse XML captions: <text start="..." dur="...">content</text>
            const lines = [...xml.matchAll(/<text[^>]*start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)]
              .map(m => {
                const secs = Math.floor(parseFloat(m[1]));
                const mm = String(Math.floor(secs / 60)).padStart(2, "0");
                const ss = String(secs % 60).padStart(2, "0");
                const text = m[2]
                  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, "");
                return `[${mm}:${ss}] ${text.trim()}`;
              });
            return {
              videoId: vid, title, language: track.languageCode, format: "xml",
              transcript: lines.join("\n").slice(0, 18000),
              totalLines: lines.length,
            };
          }

          // Parse JSON3 format
          const j3 = await transcriptRes.json() as any;
          const events = (j3.events || []).filter((e: any) => e.segs);
          const lines = events.map((e: any) => {
            const secs = Math.floor((e.tStartMs || 0) / 1000);
            const mm = String(Math.floor(secs / 60)).padStart(2, "0");
            const ss = String(secs % 60).padStart(2, "0");
            const text = (e.segs || []).map((s: any) => s.utf8 || "").join("").trim();
            return text ? `[${mm}:${ss}] ${text}` : null;
          }).filter(Boolean);

          return {
            videoId: vid, title, language: track.languageCode, format: "json3",
            transcript: lines.join("\n").slice(0, 18000),
            totalLines: lines.length,
            tip: "Timestamp'ler dakika:saniye formatında. Gol, faul, kart gibi olayları ara.",
          };
        } catch (e) {
          return { error: "Transcript alınamadı: " + String(e), videoId: vid };
        }
      }

      case "analyze_match_screen": {
        const vid = (args.videoId || "").trim();
        if (!vid) return { error: "videoId gerekli" };

        try {
          // ── Step 1: Fetch watch page → ytInitialPlayerResponse ─────────────
          const pageRes = await fetch(`https://www.youtube.com/watch?v=${vid}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Accept-Language": "tr-TR,tr;q=0.9",
            },
          });
          const html = await pageRes.text();

          const prMatch = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:\s*var|\s*<\/script>)/s);
          if (!prMatch) return { error: "ytInitialPlayerResponse bulunamadı (sayfa yüklenmedi?)", videoId: vid };

          const playerResp: any = JSON.parse(prMatch[1]);
          const title: string = playerResp.videoDetails?.title || vid;
          const durationSecs = parseInt(playerResp.videoDetails?.lengthSeconds || "0");
          const durationMins = Math.floor(durationSecs / 60);

          // ── Step 2: Parse storyboard spec ─────────────────────────────────
          // Spec format: BASE_URL_with_$L_$N|L0_params|L1_params|L2_params...
          // Level params: width#height#count#nx#ny#intervalMs#id#sig
          const specStr: string = playerResp.storyboards?.playerStoryboardSpecRenderer?.spec || "";
          if (!specStr) {
            return { videoId: vid, title, durationMins, error: "Storyboard spec bulunamadı. Video özel veya henüz işlenmemiş olabilir." };
          }

          const specParts = specStr.split("|");
          const baseUrlTemplate = specParts[0]; // has $L and $N placeholders

          // Parse levels (skip index 0 which is base URL)
          const levels = specParts.slice(1).map((p) => {
            const f = p.split("#");
            return {
              w: parseInt(f[0]) || 0,
              h: parseInt(f[1]) || 0,
              count: parseInt(f[2]) || 0,
              nx: parseInt(f[3]) || 0,
              ny: parseInt(f[4]) || 0,
              intervalMs: parseInt(f[5]) || 0,
              idTemplate: f[6] || "",
              sig: f[7] || "",
            };
          });

          // Pick best level with valid intervals (prefer higher quality)
          const validLevels = levels.filter((l) => l.intervalMs > 0 && l.nx > 0 && l.ny > 0 && l.sig);
          if (validLevels.length === 0) {
            return { videoId: vid, title, durationMins, error: "Geçerli storyboard seviyesi bulunamadı." };
          }
          // Use highest quality level available (last valid)
          const lvlIdx = levels.findLastIndex((l) => l.intervalMs > 0 && l.nx > 0 && l.ny > 0 && l.sig);
          const lvl = levels[lvlIdx];
          const framesPerSprite = lvl.nx * lvl.ny;
          const intervalSecs = lvl.intervalMs / 1000;
          const totalFrames = durationSecs > 0 ? Math.ceil(durationSecs / intervalSecs) : lvl.count;
          const totalSprites = Math.ceil(totalFrames / framesPerSprite);

          // Which sprites cover the last ~120 seconds?
          const windowSecs = 120;
          const startFrameIdx = Math.max(0, Math.floor((durationSecs - windowSecs) / intervalSecs));
          const startSprite = Math.floor(startFrameIdx / framesPerSprite);
          const endSprite = totalSprites - 1;

          // Build sprite URLs
          const spriteIndices = Array.from(
            { length: endSprite - startSprite + 1 },
            (_, i) => startSprite + i
          ).slice(-4); // at most last 4 sprites

          const spriteUrls = spriteIndices.map((idx) => {
            const n = lvl.idTemplate.replace("$M", String(idx));
            return baseUrlTemplate
              .replace("$L", String(lvlIdx))
              .replace("$N", n)
              + "&sigh=" + lvl.sig;
          });

          // ── Step 3: Fetch sprite images ────────────────────────────────────
          const b64Sprites: string[] = [];
          await Promise.all(
            spriteUrls.map(async (url) => {
              try {
                const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
                if (r.ok) {
                  const buf = Buffer.from(await r.arrayBuffer());
                  b64Sprites.push(buf.toString("base64"));
                }
              } catch { /* skip */ }
            })
          );

          if (b64Sprites.length === 0) {
            return { videoId: vid, title, durationMins, error: "Storyboard görselleri indirilemedi.", triedUrls: spriteUrls.slice(0, 2) };
          }

          // ── Step 4: GPT-4o Vision ──────────────────────────────────────────
          const frameInfo = `${lvl.w * lvl.nx}x${lvl.h * lvl.ny} piksel, her sprite ${lvl.nx}x${lvl.ny} mini kare (her kare ${intervalSecs}s aralıklı, ${lvl.w}x${lvl.h}px)`;
          const visionRes = await openai.chat.completions.create({
            model: "gpt-4o",
            max_tokens: 1500,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Bunlar "${title}" YouTube canlı yayın kaydının SON ${windowSecs} SANİYESİNE ait storyboard sprite görüntüleridir (${frameInfo}).

Her sprite görüntüsünde ${lvl.nx}x${lvl.ny} mini kare bulunur. Kareler soldan sağa, yukarıdan aşağıya doğru kronolojik sıralıdır. En son kareler en sağ-alttadır.

Görevin: Maç sonu istatistik/skor ekranını bul:
- Final skoru (hangi takım kaç kaç)
- Gol atan oyuncular + dakikaları
- Asist yapanlar
- Sarı / kırmızı kart alanlar
- Kaleci clean sheet bilgisi
- Varsa diğer istatistikler

Ekranda görülen HER şeyi yaz. Eğer stats ekranı görünmüyorsa veya net değilse bunu söyle.
Türkçe yanıt ver.`,
                  },
                  ...b64Sprites.map((b64) => ({
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${b64}`, detail: "high" },
                  })),
                ],
              },
            ],
          });

          const analysis = visionRes.choices[0]?.message?.content || "Görsel analiz sonucu alınamadı.";
          return {
            videoId: vid,
            title,
            durationMins,
            storyboardLevel: lvlIdx,
            frameSize: `${lvl.w}x${lvl.h}`,
            intervalSecs,
            spritesAnalyzed: b64Sprites.length,
            analysis,
          };
        } catch (e) {
          return { error: "Görsel analiz başarısız: " + String(e), videoId: vid };
        }
      }

      case "find_team_logo": {
        const name = (args.teamName || "").trim();
        if (!name) return { logoUrl: null, found: false, reason: "Takım adı boş" };

        // 1) TheSportsDB – ücretsiz, API key gerektirmez
        try {
          const encoded = encodeURIComponent(name);
          const sdbRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encoded}`);
          if (sdbRes.ok) {
            const sdbData = await sdbRes.json() as any;
            const team = sdbData?.teams?.[0];
            if (team?.strTeamBadge) {
              return { logoUrl: team.strTeamBadge + "/preview", found: true, source: "TheSportsDB", teamFound: team.strTeam };
            }
          }
        } catch (_) { /* devam et */ }

        // 2) Wikipedia API – article image (logo için iyi sonuç verir)
        try {
          const encoded = encodeURIComponent(name + " F.C.");
          const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`);
          if (wikiRes.ok) {
            const wiki = await wikiRes.json() as any;
            const img = wiki?.thumbnail?.source || wiki?.originalimage?.source;
            if (img) return { logoUrl: img, found: true, source: "Wikipedia" };
          }
        } catch (_) { /* devam et */ }

        // 3) Sadece takım adıyla Wikipedia dene
        try {
          const encoded = encodeURIComponent(name);
          const wikiRes2 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`);
          if (wikiRes2.ok) {
            const wiki2 = await wikiRes2.json() as any;
            const img = wiki2?.thumbnail?.source || wiki2?.originalimage?.source;
            if (img) return { logoUrl: img, found: true, source: "Wikipedia (direct)" };
          }
        } catch (_) { /* devam et */ }

        return { logoUrl: null, found: false, reason: "Logo bulunamadı" };
      }

      default: return { error: "Bilinmeyen araç" };
    }
  }

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

  // Rename a conversation
  app.patch("/api/ai/conversations/:id", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Yetkisiz erişim." });
    const id = parseInt(req.params.id);
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "title gerekli" });
    const [updated] = await db.update(aiConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(aiConversations.id, id))
      .returning();
    res.json(updated);
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

  // Send a message — tool-calling loop then streaming final response
  app.post("/api/ai/conversations/:id/messages", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Yetkisiz erişim." });
    const conversationId = parseInt(req.params.id);
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Mesaj boş olamaz." });

    await db.insert(aiMessages).values({ conversationId, role: "user", content });

    const history = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId)).orderBy(aiMessages.createdAt);

    if (history.length === 1) {
      const shortTitle = content.length > 50 ? content.slice(0, 50) + "…" : content;
      await db.update(aiConversations).set({ title: shortTitle, updatedAt: new Date() }).where(eq(aiConversations.id, conversationId));
    } else {
      await db.update(aiConversations).set({ updatedAt: new Date() }).where(eq(aiConversations.id, conversationId));
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const send = (obj: object) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    try {
      // Build message history for OpenAI
      const msgs: any[] = [
        { role: "system", content: AUREN_AI_SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role, content: m.content })),
      ];

      // Tool-calling agentic loop (max 8 rounds)
      let rounds = 0;
      while (rounds < 8) {
        rounds++;
        const response = await openai.chat.completions.create({
          model: "gpt-5.4",
          messages: msgs,
          tools: AI_TOOLS,
          tool_choice: "auto",
          max_completion_tokens: 4096,
        });

        const choice = response.choices[0];
        const assistantMsg = choice.message;
        msgs.push(assistantMsg);

        if (choice.finish_reason === "tool_calls" && assistantMsg.tool_calls?.length) {
          for (const tc of assistantMsg.tool_calls) {
            const toolName = tc.function.name;
            const toolArgs = JSON.parse(tc.function.arguments || "{}");

            send({ type: "tool_call", tool: toolName, args: toolArgs });

            let result: any;
            try {
              result = await executeAITool(toolName, toolArgs);
              send({ type: "tool_result", tool: toolName, ok: true });
            } catch (e: any) {
              result = { error: e.message };
              send({ type: "tool_result", tool: toolName, ok: false, error: e.message });
            }

            msgs.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
          continue;
        }

        // Final text response — stream it
        const finalText = assistantMsg.content || "";
        if (finalText) {
          // Simulate streaming by chunking
          const words = finalText.split(/(?<=\s)/);
          let accumulated = "";
          for (const word of words) {
            accumulated += word;
            send({ type: "content", content: word });
            await new Promise(r => setTimeout(r, 8));
          }
          await db.insert(aiMessages).values({ conversationId, role: "assistant", content: finalText });
        }
        break;
      }

      send({ type: "done" });
      res.end();
    } catch (err: any) {
      send({ type: "error", error: err.message || "AI hatası oluştu." });
      res.end();
    }
  });

  // Seed data function (removed seed content to avoid fake stats)
  async function seed() {
    // No fake data as per user request
  }

  await seed();

  return httpServer;
}
