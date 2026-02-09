/**
 * Auth - Página de autenticação SKEMA (simplificada)
 * 
 * Dois fluxos:
 * 1. Novo Jogador: código convite → nome → PIN 4 dígitos → registrado
 * 2. Entrar: nickname + PIN 4 dígitos → logado
 * 
 * Internamente usa email derivado (nickname@skema.game) + PIN como senha.
 * Guarda ascendência (invited_by) e descendência (referrals table).
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import skemaOrbit from '@/assets/skema-orbit.jpeg';
import { SplashScreen } from '@/components/SplashScreen';

const SPLASH_SHOWN_KEY = 'skema_splash_shown';


const makeAuthEmail = (nickname: string): string => {
  const safe = nickname.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'player';
  return `${safe}@skema.game`;
};

const makePinPassword = (pin: string): string => `${pin}SK`;

const NICKNAME_STORAGE_KEY = 'skema_last_nickname';

// ==================== MAIN COMPONENT ====================

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialInvite = searchParams.get('convite') || searchParams.get('invite') || '';
  const savedNickname = useMemo(() => localStorage.getItem(NICKNAME_STORAGE_KEY) || '', []);

  const [mode, setMode] = useState<'login' | 'register'>(initialInvite ? 'register' : 'login');

  // Register fields
  const [inviteCode, setInviteCode] = useState(initialInvite.toUpperCase());
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  // Login fields
  const [loginNickname, setLoginNickname] = useState(savedNickname);
  const [loginPin, setLoginPin] = useState('');

  // Shared
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Splash screen - show once per session
  const [showSplash, setShowSplash] = useState(() => {
    const shown = sessionStorage.getItem(SPLASH_SHOWN_KEY);
    return !shown;
  });
  
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem(SPLASH_SHOWN_KEY, '1');
  }, []);


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setTimeout(() => redirectIfProfile(session.user.id), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) redirectIfProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const redirectIfProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (data) navigate('/', { replace: true });
  };

  // ==================== LOGIN ====================

  const handleLogin = useCallback(async () => {
    setError(null);
    if (!loginNickname.trim()) return setError('Digite seu nickname');
    if (loginPin.length !== 4) return setError('PIN deve ter 4 dígitos');

    setIsLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: makeAuthEmail(loginNickname),
        password: makePinPassword(loginPin),
      });

      if (err) {
        setError('Nickname ou PIN incorretos');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        if (profile) {
          localStorage.setItem(NICKNAME_STORAGE_KEY, loginNickname.trim());
          navigate('/', { replace: true });
        } else {
          setError('Perfil não encontrado. Registre-se novamente.');
          await supabase.auth.signOut();
        }
      }
    } catch {
      setError('Erro inesperado');
    }
    setIsLoading(false);
  }, [loginNickname, loginPin, navigate]);

  // ==================== REGISTER ====================

  const handleRegister = useCallback(async () => {
    setError(null);
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4) return setError('Código de convite inválido');
    if (name.trim().length < 2) return setError('Nickname deve ter pelo menos 2 caracteres');
    if (pin.length !== 4) return setError('PIN deve ter 4 dígitos');

    setIsLoading(true);
    try {
      // 1. Validate invite code
      const { data: validation, error: valErr } = await supabase.rpc('validate_invite_code', { p_code: code });
      if (valErr || !validation) {
        setError('Código de convite inválido');
        setIsLoading(false);
        return;
      }

      const result = validation as unknown as { valid: boolean; inviter_name: string | null; reason?: string };
      if (!result.valid) {
        if (result.reason === 'code_already_used') {
          setError('Este código de convite já foi utilizado. Peça um novo código.');
        } else {
          setError('Código de convite inválido');
        }
        setIsLoading(false);
        return;
      }

      // 2. Create auth user
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: makeAuthEmail(name),
        password: makePinPassword(pin),
        options: { emailRedirectTo: `${window.location.origin}/` },
      });

      if (signUpErr) {
        setError(signUpErr.message.includes('already registered')
          ? 'Este nickname já está em uso.'
          : signUpErr.message);
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Erro ao criar conta.');
        setIsLoading(false);
        return;
      }

      // 3. Create profile + referral (ascendência/descendência)
      const { error: profileErr } = await supabase.rpc('register_player', {
        p_name: name.trim(),
        p_emoji: '🎮',
        p_invite_code: code,
      });

      if (profileErr) {
        setError(profileErr.message.includes('duplicate') || profileErr.message.includes('unique')
          ? 'Este nickname já está em uso.'
          : 'Erro ao criar perfil: ' + profileErr.message);
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // 4. Save PIN reference
      await supabase.from('profiles').update({ pin }).eq('user_id', authData.user.id);

      // 5. Done
      localStorage.setItem(NICKNAME_STORAGE_KEY, name.trim());
      navigate('/', { replace: true });
    } catch {
      setError('Erro inesperado ao registrar');
    }
    setIsLoading(false);
  }, [inviteCode, name, pin, navigate]);

  // ==================== RENDER ====================

  const inputClass = "bg-card/80 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20";

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Splash screen */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {/* Cosmic background */}
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${skemaOrbit})` }} />
      <div className="fixed inset-0 bg-black/70 backdrop-blur-[1px]" />
      
      {/* Radial glow effect */}
      <div className="fixed inset-0 bg-radial-gradient pointer-events-none" 
        style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)' }} 
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Logo + Tagline */}
        <div className="text-center mb-6">
          <motion.h1 
            initial={{ letterSpacing: '0.3em' }}
            animate={{ letterSpacing: '0.15em' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-200 to-purple-400"
          >
            SKEMA
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-purple-300/60 text-xs mt-2 tracking-[0.15em] uppercase font-light"
          >
            Cada escolha uma renúncia, uma consequência...
          </motion.p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === 'login' ? 'default' : 'outline'}
            onClick={() => { setMode('login'); setError(null); }}
            className="flex-1"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Entrar
          </Button>
          <Button
            variant={mode === 'register' ? 'default' : 'outline'}
            onClick={() => { setMode('register'); setError(null); }}
            className="flex-1"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>

        {/* Card */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 space-y-4">
          {mode === 'login' ? (
            <>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nickname</label>
                <Input
                  placeholder="Seu nickname"
                  value={loginNickname}
                  onChange={(e) => setLoginNickname(e.target.value)}
                  className={inputClass}
                  maxLength={15}
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">PIN (4 dígitos)</label>
                <div className="flex justify-center">
                  <InputOTP maxLength={4} pattern={REGEXP_ONLY_DIGITS} value={loginPin} onChange={setLoginPin}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3].map(i => (
                        <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl border-border bg-card/80" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {error && <ErrorBox message={error} />}

              <Button
                onClick={handleLogin}
                disabled={!loginNickname.trim() || loginPin.length !== 4 || isLoading}
                className="w-full h-12"
              >
                {isLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Código de Convite</label>
                <Input
                  placeholder="Ex: SKINV1A2B3C"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className={`${inputClass} text-center tracking-wider`}
                  maxLength={15}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Escolha seu Nickname</label>
                <Input
                  placeholder="Seu nickname único"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  maxLength={15}
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Crie um PIN (4 dígitos)</label>
                <div className="flex justify-center">
                  <InputOTP maxLength={4} pattern={REGEXP_ONLY_DIGITS} value={pin} onChange={setPin}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3].map(i => (
                        <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl border-border bg-card/80" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Lembre do nickname e PIN — é só isso pra voltar!
              </p>

              {error && <ErrorBox message={error} />}

              <Button
                onClick={handleRegister}
                disabled={inviteCode.length < 4 || name.trim().length < 2 || pin.length !== 4 || isLoading}
                className="w-full h-12"
              >
                {isLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : <>Entrar no SKEMA <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Não tem código? Peça a um amigo que já está no SKEMA!
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ==================== ERROR BOX ====================

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}
