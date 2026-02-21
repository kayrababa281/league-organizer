import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-6">
        <AlertTriangle className="w-24 h-24 text-primary mx-auto opacity-80" />
        <h1 className="text-4xl font-black font-display">404 - Sayfa Bulunamadı</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <Link href="/">
          <Button size="lg" className="rounded-full px-8">Ana Sayfaya Dön</Button>
        </Link>
      </div>
    </div>
  );
}
