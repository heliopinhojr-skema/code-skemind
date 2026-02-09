/**
 * Auth - Página de autenticação SKEMA (simplificada)
 * 
 * Três fases:
 * 0. Welcome: tela cósmica com "toque para entrar"
 * 1. Novo Jogador: código convite → nome → PIN 4 dígitos → registrado
 * 2. Entrar: nickname + PIN 4 dígitos → logado
 * 
 * Internamente usa email derivado (nickname@skema.game) + PIN como senha.
 * Guarda ascendência (invited_by) e descendência (referrals table).
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, AlertCircle, Sparkles, LogIn, UserPlus, ShieldAlert } from 'lucide-react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import skemaOrbit from '@/assets/skema-orbit.jpeg';
import skemaGenesis from '@/assets/skema-genesis.jpeg';
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

  // Phase: 'welcome' → 'auth'
  const [phase, setPhase] = useState<'welcome' | 'auth'>(initialInvite ? 'auth' : 'welcome');
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

      await supabase.from('profiles').update({ pin }).eq('user_id', authData.user.id);

      localStorage.setItem(NICKNAME_STORAGE_KEY, name.trim());
      navigate('/', { replace: true });
    } catch {
      setError('Erro inesperado ao registrar');
    }
    setIsLoading(false);
  }, [inviteCode, name, pin, navigate]);

  // ==================== RENDER ====================

  const inputClass = "bg-card/80 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20";

  // Background image based on mode
  const bgImage = mode === 'register' ? skemaGenesis : skemaOrbit;

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Splash screen */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Cosmic background - switches based on mode */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase === 'welcome' ? 'welcome-bg' : mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${phase === 'welcome' ? skemaOrbit : bgImage})` }}
        />
      </AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[1px]" />
      
      {/* Radial glow */}
      <div className="fixed inset-0 pointer-events-none" 
        style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)' }} 
      />

      <AnimatePresence mode="wait">
        {/* ========== WELCOME PHASE ========== */}
        {phase === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            onClick={() => setPhase('auth')}
            className="relative z-10 flex flex-col items-center justify-center text-center cursor-pointer select-none px-8"
          >
            {/* SKEMA title */}
            <motion.h1
              initial={{ opacity: 0, y: -30, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.2em' }}
              transition={{ delay: 0.3, duration: 1.2, ease: 'easeOut' }}
              className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-200 to-purple-400 drop-shadow-2xl"
            >
              SKEMA
            </motion.h1>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 0.8, ease: 'easeInOut' }}
              className="w-48 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent mt-4 mb-6"
            />

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 1 }}
              className="text-sm md:text-base tracking-[0.12em] uppercase text-purple-200/70 font-light max-w-sm"
            >
              Cada escolha uma renúncia,
              <br />
              uma consequência...
            </motion.p>

            {/* Tap to continue */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0] }}
              transition={{ delay: 2.5, duration: 2, repeat: Infinity }}
              className="mt-16 text-xs text-white/40 tracking-[0.2em] uppercase"
            >
              Toque para entrar
            </motion.p>
          </motion.div>
        )}

        {/* ========== AUTH PHASE ========== */}
        {phase === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
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
              <AnimatePresence mode="wait">
                {mode === 'login' ? (
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
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
                  </motion.div>
                ) : (
                  <motion.div
                    key="register-form"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {/* ⚠️ NO RECOVERY WARNING */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-yellow-300">
                          Sem recuperação de conta
                        </p>
                        <p className="text-[11px] text-yellow-200/70 mt-0.5 leading-relaxed">
                          Não existe "esqueci minha senha". Guarde seu <strong>Nickname</strong> e <strong>PIN</strong> em local seguro. Se perder, não há como recuperar.
                        </p>
                      </div>
                    </div>

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

                    {/* Reminder after PIN */}
                    <p className="text-[11px] text-center text-muted-foreground/80 leading-relaxed">
                      ⚠️ Anote agora: <strong>Nickname</strong> + <strong>PIN</strong> = seu único acesso. Nunca esqueça!
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
