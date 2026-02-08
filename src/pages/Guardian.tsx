/**
 * Guardian - Painel administrativo para usuários com role guardian
 * master_admin: acesso total (criar corridas, gerenciar, etc.)
 * guardiao (Criador): acesso somente leitura (monitoramento)
 */

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsGuardian, useIsMasterAdmin } from '@/hooks/useGuardianData';
import { GuardianDashboard } from '@/components/guardian/GuardianDashboard';
import { GuardianUsersTable } from '@/components/guardian/GuardianUsersTable';
import { GuardianReferralTree } from '@/components/guardian/GuardianReferralTree';
import { GuardianSkemaBox } from '@/components/guardian/GuardianSkemaBox';
import { GuardianRacesPanel } from '@/components/guardian/GuardianRacesPanel';
import { supabase } from '@/integrations/supabase/client';
import { Crown, LogOut, LayoutDashboard, Users, GitBranch, Box, Trophy, Eye } from 'lucide-react';
import { CosmicBackground } from '@/components/CosmicBackground';

export default function Guardian() {
  const { data: isGuardian, isLoading: isCheckingRole } = useIsGuardian();
  const { data: isMasterAdmin } = useIsMasterAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Loading state
  if (isCheckingRole) {
    return (
      <div className="min-h-screen bg-background relative">
        <CosmicBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Crown className="h-12 w-12 mx-auto text-primary animate-pulse" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not guardian
  if (!isGuardian) {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'referrals', label: 'Convites', icon: GitBranch },
    { id: 'skemabox', label: 'Skema Box', icon: Box },
    { id: 'races', label: 'Corridas', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      {/* Overlay escuro mais forte para melhor contraste */}
      <div className="fixed inset-0 bg-black/80 z-[1]" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/90 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4">
            {/* Badge de área restrita */}
            <div className="flex justify-center mb-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                isMasterAdmin 
                  ? 'bg-destructive/20 border border-destructive/40 text-destructive' 
                  : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  isMasterAdmin ? 'bg-destructive' : 'bg-amber-500'
                }`} />
                <span className="font-medium uppercase tracking-wider">
                  {isMasterAdmin ? 'Área Restrita • Master Admin' : 'Painel de Monitoramento • Somente Leitura'}
                </span>
              </div>
            </div>

            {/* Read-only banner for non-admin */}
            {!isMasterAdmin && (
              <div className="flex items-center gap-2 justify-center mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Eye className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-amber-400">
                  Modo visualização — ações administrativas restritas ao CD HX
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-foreground">Painel Guardian</h1>
                  <p className="text-xs text-muted-foreground">
                    {isMasterAdmin ? 'Administração SKEMA' : 'Monitoramento SKEMA'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex bg-card/80 backdrop-blur-sm border border-border/50">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <GuardianDashboard />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <GuardianUsersTable />
            </TabsContent>

            <TabsContent value="referrals" className="space-y-6">
              <GuardianReferralTree />
            </TabsContent>

            <TabsContent value="skemabox" className="space-y-6">
              <GuardianSkemaBox />
            </TabsContent>

            <TabsContent value="races" className="space-y-6">
              <GuardianRacesPanel isMasterAdmin={isMasterAdmin === true} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
