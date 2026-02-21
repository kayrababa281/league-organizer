import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { loginAsync, logout, user, isLoggingIn } = useAuth();
  const [_, setLocation] = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [mathQuestion, setMathQuestion] = useState({ n1: 0, n2: 0 });
  const [answer, setAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.userId || user?.isAdmin) {
      setLocation("/");
    }
    generateMath();
  }, [user, setLocation]);

  const generateMath = () => {
    setMathQuestion({
      n1: Math.floor(Math.random() * 10) + 1,
      n2: Math.floor(Math.random() * 10) + 1
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      if (parseInt(answer) !== mathQuestion.n1 + mathQuestion.n2) {
        toast({ variant: "destructive", title: "Hata", description: "Matematik sorusu yanlış!" });
        return;
      }
      try {
        let finalAvatarUrl = avatarUrl;
        
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            finalAvatarUrl = uploadData.url;
          }
        }

        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, avatarUrl: finalAvatarUrl, bio, answer, num1: mathQuestion.n1, num2: mathQuestion.n2 })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Kayıt başarısız");
        }
        // After successful registration, log in
        await loginAsync({ username, password });
        setLocation("/");
      } catch (err: any) {
        toast({ variant: "destructive", title: "Hata", description: err.message });
      }
    } else {
      try {
        await logout(); // Clear any existing session before logging in
        await loginAsync({ username, password });
        setLocation("/");
      } catch (err) {}
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4 relative">
      <div className="absolute top-4 left-4">
        <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
          Ana Sayfa
        </Button>
      </div>
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black font-display">
              {isRegister ? "Kayıt Ol" : "Giriş Yap"}
            </CardTitle>
            <CardDescription>
              {isRegister ? "Auren League'e katılın" : "Yönetim paneline veya hesabınıza erişin"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            
            {isRegister && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="avatar">Profil Fotoğrafı</Label>
                  <Input 
                    id="avatar" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    className="bg-secondary/50 border-none rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Biyografi (İsteğe Bağlı)</Label>
                  <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kendinizden bahsedin..." className="bg-secondary/50 border-none rounded-xl" />
                </div>
                <div className="space-y-2 p-3 bg-muted rounded-lg border">
                  <Label className="text-primary font-bold">Güvenlik Sorusu: {mathQuestion.n1} + {mathQuestion.n2} = ?</Label>
                  <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Cevap..." required className="bg-background" />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="animate-spin" /> : (isRegister ? "Kayıt Ol" : "Giriş Yap")}
            </Button>
            
            <div className="text-center">
              <Button type="button" variant="ghost" onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? "Zaten hesabınız var mı? Giriş yapın" : "Hesabınız yok mu? Kayıt olun"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
