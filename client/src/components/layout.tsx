import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Trophy,
  CalendarDays,
  Users,
  Shield,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Home,
  Star,
  Globe,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setIsOpen(false), [location]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const navItems = [
    { href: "/", label: "Ana Sayfa", icon: Home },
    { href: "/standings", label: "Puan Durumu", icon: Trophy },
    { href: "/fixtures", label: "Fikstür", icon: CalendarDays },
    { href: "/stats", label: "İstatistikler", icon: Users },
    { href: "/chat", label: "Sohbet", icon: MessageSquare },
    { section: "Kupalar" },
    { href: "/carabag-cup", label: "Carabağ Cup", icon: Trophy },
    { href: "/auren-lig-cup", label: "Auren Lig Cup", icon: Trophy },
    { href: "/champions-league", label: "Champions League", icon: Star },
    { href: "/europa-league", label: "UEFA Avrupa Ligi", icon: Globe },
    { href: "/super-cup", label: "UEFA Süper Kupa", icon: Shield },
  ];

  if (user && user.isAdmin === true) {
    navItems.push({ section: "Admin" });
    navItems.push({ href: "/auren-ai", label: "Auren AI", icon: Sparkles });
    navItems.push({ href: "/admin", label: "Admin Panel", icon: Settings });
  }

  const SidebarInner = (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      {/* Logo — desktop only */}
      <div className="hidden md:flex items-center justify-between mb-6 px-2">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-black text-primary hover:opacity-80 transition-opacity">
          <Trophy className="h-8 w-8" />
          <span>AUREN</span>
        </Link>
      </div>

      {/* Mobile sidebar header */}
      <div className="md:hidden flex items-center justify-between mb-4 px-1">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-black text-primary">
          <Trophy className="h-6 w-6" />
          AUREN LIG
        </Link>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="space-y-0.5 flex-1">
        {navItems.map((item: any, idx) => {
          if (item.section) {
            return (
              <div key={idx} className="pt-4 pb-1.5 px-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                  {item.section}
                </span>
              </div>
            );
          }
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                ${isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"}
              `}
            >
              <Icon className={`h-4 w-4 shrink-0 ${!isActive ? "group-hover:scale-110 transition-transform" : ""}`} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-border/50 space-y-3">
        {/* Theme toggle — desktop only (mobile has it in header) */}
        <div className="hidden md:flex items-center justify-between px-2">
          <span className="text-sm font-medium text-muted-foreground">Tema</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        {/* Discord + Copyright */}
        <div className="flex items-center justify-between px-1 pb-1">
          <a
            href="https://discord.gg/aurenlig"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-[#5865F2] transition-colors duration-200 group"
            title="Discord Sunucumuza Katıl"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current transition-transform duration-200 group-hover:scale-110" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span className="text-xs font-semibold">Discord</span>
          </a>
          <span className="text-[10px] text-muted-foreground/50">© Vlycare</span>
        </div>

        {/* User card / Login */}
        {user && (user.userId || user.isAdmin) ? (
          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border border-border/50">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground truncate max-w-[120px]">
                {user.identifier}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.isAdmin ? "Yönetici" : "Üye"}
              </span>
            </div>
            <button
              onClick={async () => { await logout(); window.location.href = "/"; }}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            Giriş Yap / Kayıt Ol
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">

      {/* ── Mobile Header ── */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border/50 bg-card/95 backdrop-blur-sm shrink-0">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-black text-primary">
          <Trophy className="h-5 w-5" />
          AUREN LIG
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Mobile Sidebar overlay ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Sidebar (mobile: slide-in, desktop: static) ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border/50 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:flex md:flex-col md:shrink-0
        ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}>
        {SidebarInner}
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-h-0 overflow-y-auto md:h-screen bg-secondary/30">
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* ── Theme toggle floating button — desktop only ── */}
      <div className="hidden md:block fixed bottom-6 right-6 z-30">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-14 w-14 rounded-full shadow-2xl bg-card border-2 border-primary/20 hover:border-primary/50 transition-all duration-500 overflow-hidden"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <Sun className={`h-8 w-8 text-yellow-500 absolute transition-all duration-700 ease-in-out ${theme === "dark" ? "translate-y-16 opacity-0" : "translate-y-0 opacity-100"}`} />
            <Moon className={`h-8 w-8 text-blue-400 absolute transition-all duration-700 ease-in-out ${theme === "dark" ? "translate-y-0 opacity-100" : "-translate-y-16 opacity-0"}`} />
          </div>
        </Button>
      </div>
    </div>
  );
}
