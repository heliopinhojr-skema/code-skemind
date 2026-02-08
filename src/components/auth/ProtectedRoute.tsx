/**
 * ProtectedRoute - Componente de proteção de rotas
 * Redireciona usuários não autenticados para /auth
 * Suporta verificação de role opcional (ex: guardian)
 * Suporta rotas exclusivas para jogadores (playerOnly)
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: AppRole;
  playerOnly?: boolean; // Rotas exclusivas para jogadores (não-guardians)
}

export function ProtectedRoute({ children, requireRole, playerOnly }: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRequiredRole, setHasRequiredRole] = useState<boolean | null>(null);
  const [isGuardian, setIsGuardian] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      if (!session) {
        setLoading(false);
        setHasRequiredRole(null);
        setIsGuardian(null);
      }
    });

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check role when session changes
  useEffect(() => {
    async function checkRoles() {
      if (!session) {
        setLoading(false);
        setHasRequiredRole(requireRole ? false : null);
        setIsGuardian(null);
        return;
      }

      // Check if user is master_admin (only /guardian access)
      const { data: isGuardianAdmin, error: guardianError } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'master_admin'
      });

      if (guardianError) {
        console.error('Error checking guardian role:', guardianError);
      }

      // Check if user is guardiao (guardian that plays - normal lobby access)
      const { data: isGuardiaoRole, error: guardiaoError } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'guardiao'
      });

      if (guardiaoError) {
        console.error('Error checking guardiao role:', guardiaoError);
      }

      const isGuardianMasterAdmin = isGuardianAdmin === true;
      const isGuardiao = isGuardiaoRole === true;

      // Master Admin - blocked from player routes, goes to /guardian
      // Guardião (playable guardian) - can access lobby normally
      setIsGuardian(isGuardianMasterAdmin && !isGuardiao);

      // Handle requireRole checks
      if (requireRole === 'master_admin') {
        // Only master admins can access /guardian
        setHasRequiredRole(isGuardianMasterAdmin);
      } else if (requireRole) {
        // Check other specific roles
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: requireRole
        });

        if (error) {
          console.error('Error checking role:', error);
          setHasRequiredRole(false);
        } else {
          setHasRequiredRole(data === true);
        }
      }
      
      setLoading(false);
    }

    if (session) {
      checkRoles();
    }
  }, [session, requireRole, playerOnly]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Verificando sessão...</div>
      </div>
    );
  }

  if (!session) {
    // Preserve invite code from URL (query params or path params)
    const searchParams = new URLSearchParams(location.search);
    const inviteFromQuery = searchParams.get('convite') || searchParams.get('invite');
    
    // Extract invite code from path (e.g., /convite/SKXXXXXX or /invite/SKXXXXXX)
    const pathMatch = location.pathname.match(/^\/(convite|invite)\/([A-Za-z0-9]+)/);
    const inviteFromPath = pathMatch ? pathMatch[2] : null;
    
    const inviteCode = inviteFromPath || inviteFromQuery;
    
    // Build redirect URL with invite code if present
    const redirectUrl = inviteCode 
      ? `/auth?convite=${encodeURIComponent(inviteCode.toUpperCase())}`
      : '/auth';
    
    return <Navigate to={redirectUrl} replace />;
  }

  // If role is required but user doesn't have it, redirect to home
  if (requireRole && hasRequiredRole === false) {
    return <Navigate to="/" replace />;
  }

  // If route is playerOnly and user is guardian, redirect to guardian panel
  if (playerOnly && isGuardian === true) {
    return <Navigate to="/guardian" replace />;
  }

  return <>{children}</>;
}
