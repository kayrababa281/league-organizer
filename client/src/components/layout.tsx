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
    navItems.push({ href: "/admin", label: "Admin Panel", icon: Settings });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <Trophy className="h-6 w-6" />
          AUREN LIG
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <button onClick={() => setIsOpen(!isOpen)} className="p-2">
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col h-full p-4 overflow-y-auto">
          <div className="hidden md:flex items-center justify-between mb-6 px-2">
            <Link href="/" className="flex items-center gap-2 font-display text-2xl font-black text-primary hover:opacity-80 transition-opacity">
              <Trophy className="h-8 w-8" />
              <span>AUREN</span>
            </Link>
          </div>

          <nav className="space-y-1 flex-1">
            {navItems.map((item: any, idx) => {
              if (item.section) {
                return (
                  <div key={idx} className="pt-3 pb-1 px-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                      {item.section}
                    </span>
                  </div>
                );
              }
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"}
                `}>
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "" : "group-hover:scale-110 transition-transform"}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-4 border-t space-y-3">
            <div className="hidden md:flex items-center justify-between px-2">
              <span className="text-sm font-medium text-muted-foreground">Tema</span>
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-full">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>

            {user && (user.userId || user.isAdmin) ? (
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-foreground truncate max-w-[120px]">
                    {user.identifier}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.isAdmin ? "Yönetici" : "Üye"}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    window.location.href = "/";
                  }}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="flex items-center justify-center w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                Giriş Yap / Kayıt Ol
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-secondary/30">
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Theme Toggle floating button */}
      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-14 w-14 rounded-full shadow-2xl bg-card border-2 border-primary/20 hover:border-primary/50 transition-all duration-500 group overflow-hidden"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <Sun className={`h-8 w-8 text-yellow-500 absolute transition-all duration-700 ease-in-out ${theme === 'dark' ? 'translate-y-16 opacity-0' : 'translate-y-0 opacity-100'}`} />
            <Moon className={`h-8 w-8 text-blue-400 absolute transition-all duration-700 ease-in-out ${theme === 'dark' ? 'translate-y-0 opacity-100' : '-translate-y-16 opacity-0'}`} />
          </div>
        </Button>
      </div>

      {/* Overlay for mobile sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
