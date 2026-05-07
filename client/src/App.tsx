import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { Layout } from "@/components/layout";

import Home from "@/pages/home";
import Standings from "@/pages/standings";
import Fixtures from "@/pages/fixtures";
import Stats from "@/pages/stats";
import Chat from "@/pages/chat";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import CarabagCup from "@/pages/carabag-cup";
import AurenLigCup from "@/pages/auren-lig-cup";
import CupPage from "@/pages/cup-page";
import AurenAI from "@/pages/auren-ai";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      <Route path="/">
        <Layout><Home /></Layout>
      </Route>
      <Route path="/standings">
        <Layout><Standings /></Layout>
      </Route>
      <Route path="/fixtures">
        <Layout><Fixtures /></Layout>
      </Route>
      <Route path="/stats">
        <Layout><Stats /></Layout>
      </Route>
      <Route path="/chat">
        <Layout><Chat /></Layout>
      </Route>
      <Route path="/admin">
        <Layout><Admin /></Layout>
      </Route>

      {/* Cup pages */}
      <Route path="/carabag-cup">
        <Layout><CarabagCup /></Layout>
      </Route>
      <Route path="/auren-lig-cup">
        <Layout><AurenLigCup /></Layout>
      </Route>
      <Route path="/champions-league">
        <Layout><CupPage tournament="champions_league" /></Layout>
      </Route>
      <Route path="/europa-league">
        <Layout><CupPage tournament="europa_league" /></Layout>
      </Route>
      <Route path="/super-cup">
        <Layout><CupPage tournament="super_cup" /></Layout>
      </Route>
      <Route path="/auren-ai">
        <Layout><AurenAI /></Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <Router />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
