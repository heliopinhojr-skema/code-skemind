/**
 * Auth - Página de autenticação SKEMA
 * 
 * Fluxos:
 * 1. Registro: código de convite → nickname + emoji + PIN 4 dígitos
 * 2. Login: nickname + PIN 4 dígitos
 * 
 * Internamente usa email derivado do nickname (nickname@skema.game) 
 * + PIN como senha no Supabase Auth para manter sessões persistentes.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, Sparkles, ArrowRight, Check, AlertCircle,
  Zap, LogIn, UserPlus,
  Crown, Shield, Star, Users
} from 'lucide-react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import universeBg from '@/assets/universe-bg.jpg';

// ==================== CONSTANTS ====================

const MASTER_INVITE_CODES = ['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];
const AVAILABLE_EMOJIS = ['🎮', '🚀', '⚡', '🔥', '💎', '🌟', '🎯', '👾', '🤖', '🧠', '💜', '🎲'];
const NICKNAME_STORAGE_KEY = 'skema_last_nickname';

// ==================== HELPERS ====================

/** Derive a deterministic fake email from nickname for Supabase Auth */
const makeAuthEmail = (nickname: string): string => {
  const safe = nickname.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'player';
  return `${safe}@skema.game`;
};

/** Extend 4-digit PIN to meet Supabase's 6-char password minimum */
const makePinPassword = (pin: string): string => `${pin}SK`;

// ==================== ANIMATION VARIANTS ====================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
};

// ==================== VISUAL COMPONENTS ====================

const FloatingParticles = () => {
  const particles = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 10 + i * 12,
      duration: 8 + i * 1.5,
      delay: i * 1.2,
      size: 4 + Math.random() * 4,
    })), []
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/30"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            bottom: '5%',
          }}
          animate={{
            y: [0, -150, 0],
            x: [0, (p.id % 2 === 0 ? 30 : -30), 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

const GlowEffect = () => (
  <motion.div
    className="absolute inset-0 -z-10 rounded-3xl blur-3xl"
    style={{
      background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.15), transparent 70%)',
    }}
    animate={{
      opacity: [0.3, 0.6, 0.3],
      scale: [1, 1.05, 1],
    }}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

const ShimmerLogo = () => (
  <motion.h1 
    className="text-4xl font-black text-transparent bg-clip-text"
    style={{
      backgroundImage: 'linear-gradient(90deg, hsl(var(--primary)), hsl(270 70% 60%), hsl(var(--primary)))',
      backgroundSize: '200% auto',
    }}
    animate={{ 
      backgroundPosition: ['0% center', '200% center'] 
    }}
    transition={{ 
      duration: 3, 
      repeat: Infinity, 
      ease: 'linear' 
    }}
  >
    SKEMA
  </motion.h1>
);

const inputClassName = "bg-card/80 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 transition-all duration-200";

// ==================== TIER BENEFITS ====================

interface TierBenefits {
  tierName: string;
  tierLabel: string;
  energy: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGradient: string;
  description: string;
  features: string[];
}

function getTierBenefits(inviterTier: string | null, inviterIsGuardian: boolean): TierBenefits {
  if (inviterIsGuardian || inviterTier === 'master_admin') {
    return {
      tierName: 'guardiao',
      tierLabel: 'Guardião',
      energy: '∞ Energia Infinita',
      icon: Shield,
      color: 'text-amber-400',
      bgGradient: 'from-amber-500/20 to-yellow-500/10',
      description: 'Você foi escolhido como Guardião',
      features: ['Energia ilimitada para sempre', 'Pode convidar Grão Mestres', 'Acesso prioritário a eventos']
    };
  }
  
  if (inviterTier === 'guardiao') {
    return {
      tierName: 'grao_mestre',
      tierLabel: 'Grão Mestre',
      energy: 'k$15.000 de energia',
      icon: Crown,
      color: 'text-purple-400',
      bgGradient: 'from-purple-500/20 to-violet-500/10',
      description: 'Você está sendo promovido a Grão Mestre',
      features: ['k$13.000 para convidar Mestres', 'k$2.000 para jogar', 'Pode convidar Mestres']
    };
  }
  
  if (inviterTier === 'grao_mestre') {
    return {
      tierName: 'mestre',
      tierLabel: 'Mestre',
      energy: 'k$1.300 de energia',
      icon: Star,
      color: 'text-cyan-400',
      bgGradient: 'from-cyan-500/20 to-teal-500/10',
      description: 'Você está sendo promovido a Mestre',
      features: ['k$1.300 de energia inicial', 'Pode convidar Jogadores', 'Status de Mestre no ranking']
    };
  }
  
  return {
    tierName: 'jogador',
    tierLabel: 'Jogador',
    energy: 'k$10 de energia',
    icon: Users,
    color: 'text-primary',
    bgGradient: 'from-accent/10 to-primary/10',
    description: 'Bônus de Boas-vindas',
    features: ['k$10 de energia inicial', 'Refill diário gratuito', 'Pode convidar outros Jogadores']
  };
}

const TierBenefitsCard = ({ 
  inviterTier, 
  inviterIsGuardian 
}: { 
  inviterTier: string | null; 
  inviterIsGuardian: boolean;
}) => {
  const benefits = getTierBenefits(inviterTier, inviterIsGuardian);
  const IconComponent = benefits.icon;
  
  return (
    <motion.div 
      variants={itemVariants}
      className={`bg-gradient-to-r ${benefits.bgGradient} border border-border/30 rounded-xl p-4`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <IconComponent className={`w-5 h-5 ${benefits.color}`} />
        <span className={`font-semibold ${benefits.color}`}>{benefits.description}</span>
      </div>
      
      <div className="flex items-center gap-2 mb-3 bg-background/30 rounded-lg px-3 py-2">
        <span className="text-xs text-muted-foreground">Seu tier:</span>
        <span className={`font-bold ${benefits.color}`}>{benefits.tierLabel}</span>
      </div>
      
      <ul className="space-y-2 text-sm text-foreground/80">
        {benefits.features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2">
            {index === 0 ? (
              <Zap className={`w-4 h-4 ${benefits.color}`} />
            ) : (
              <Sparkles className="w-4 h-4 text-secondary" />
            )}
            {feature}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

// ==================== PIN INPUT COMPONENT ====================

const PinInput = ({ 
  value, 
  onChange, 
  label 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  label: string; 
}) => (
  <motion.div variants={itemVariants}>
    <label className="text-sm text-muted-foreground mb-3 block">{label}</label>
    <div className="flex justify-center">
      <InputOTP 
        maxLength={4} 
        pattern={REGEXP_ONLY_DIGITS}
        value={value} 
        onChange={onChange}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} className="w-12 h-14 text-xl border-border bg-card/80" />
          <InputOTPSlot index={1} className="w-12 h-14 text-xl border-border bg-card/80" />
          <InputOTPSlot index={2} className="w-12 h-14 text-xl border-border bg-card/80" />
          <InputOTPSlot index={3} className="w-12 h-14 text-xl border-border bg-card/80" />
        </InputOTPGroup>
      </InputOTP>
    </div>
  </motion.div>
);

// ==================== ERROR DISPLAY ====================

const ErrorMessage = ({ message }: { message: string }) => (
  <motion.div
    initial={{ opacity: 0, y: -10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20"
  >
    <AlertCircle className="w-4 h-4 shrink-0" />
    {message}
  </motion.div>
);

// ==================== LOADING BUTTON ====================

const ActionButton = ({ 
  onClick, 
  disabled, 
  isLoading, 
  children 
}: { 
  onClick: () => void; 
  disabled: boolean; 
  isLoading: boolean; 
  children: React.ReactNode;
}) => (
  <motion.div variants={itemVariants}>
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full h-12 relative overflow-hidden group"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
      {isLoading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-5 h-5" />
        </motion.div>
      ) : (
        children
      )}
    </Button>
  </motion.div>
);

// ==================== MAIN COMPONENT ====================

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialInviteCode = searchParams.get('convite') || searchParams.get('invite') || '';
  
  const savedNickname = useMemo(() => localStorage.getItem(NICKNAME_STORAGE_KEY) || '', []);
  
  const [mode, setMode] = useState<'login' | 'register'>(initialInviteCode ? 'register' : 'login');
  const [step, setStep] = useState<'invite' | 'profile' | 'success'>('invite');
  
  // Registration fields
  const [inviteCode, setInviteCode] = useState(initialInviteCode.toUpperCase());
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎮');
  const [pin, setPin] = useState('');
  
  // Login fields
  const [loginNickname, setLoginNickname] = useState(savedNickname);
  const [loginPin, setLoginPin] = useState('');
  
  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [inviterTier, setInviterTier] = useState<string | null>(null);
  const [inviterIsGuardian, setInviterIsGuardian] = useState(false);

  // ==================== AUTH STATE CHECK ====================
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setTimeout(() => {
          checkProfileAndRedirect(session.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkProfileAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfileAndRedirect = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (profile) {
      navigate('/', { replace: true });
    }
  };

  // ==================== VALIDATE INVITE CODE ====================
  
  const handleValidateCode = useCallback(async () => {
    setError(null);
    const trimmedCode = inviteCode.trim().toUpperCase();
    
    if (trimmedCode.length < 4) {
      setError('Código muito curto');
      return;
    }
    
    setIsLoading(true);
    
    const { data, error: rpcError } = await supabase.rpc('validate_invite_code', {
      p_code: trimmedCode
    });
    
    setIsLoading(false);
    
    if (rpcError || !data) {
      setError('Código de convite inválido');
      return;
    }
    
    const result = data as unknown as {
      valid: boolean;
      inviter_id: string | null;
      inviter_name: string | null;
      inviter_tier: string | null;
      inviter_is_guardian: boolean;
    };
    
    if (result.valid) {
      setInviterName(result.inviter_name || null);
      setInviterTier(result.inviter_tier || null);
      setInviterIsGuardian(result.inviter_is_guardian === true);
      setStep('profile');
    } else {
      setError('Código de convite inválido');
    }
  }, [inviteCode]);

  // ==================== REGISTER ====================
  
  const handleRegister = useCallback(async () => {
    setError(null);
    
    if (name.trim().length < 2) {
      setError('Nickname deve ter pelo menos 2 caracteres');
      return;
    }
    
    if (pin.length !== 4) {
      setError('PIN deve ter 4 dígitos');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 1. Sign up with fake email derived from nickname
      const fakeEmail = makeAuthEmail(name);
      const password = makePinPassword(pin);
      
      console.log('[AUTH] Registering:', { name: name.trim(), emoji: selectedEmoji });
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (signUpError) {
        console.error('[AUTH] SignUp error:', signUpError);
        if (signUpError.message.includes('already registered')) {
          setError('Este nickname já está em uso. Escolha outro.');
        } else {
          setError(signUpError.message);
        }
        setIsLoading(false);
        return;
      }
      
      if (!authData.user) {
        setError('Erro ao criar conta. Tente novamente.');
        setIsLoading(false);
        return;
      }
      
      // 2. Create profile via RPC
      const { error: profileError } = await supabase.rpc('register_player', {
        p_name: name.trim(),
        p_emoji: selectedEmoji,
        p_invite_code: inviteCode.toUpperCase()
      });
      
      if (profileError) {
        console.error('[AUTH] Profile error:', profileError);
        if (profileError.message.includes('duplicate') || profileError.message.includes('unique')) {
          setError('Este nickname já está em uso. Escolha outro.');
        } else {
          setError('Erro ao criar perfil: ' + profileError.message);
        }
        // Clean up auth user since profile failed
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }
      
      // 3. Save PIN in profile for reference
      await supabase
        .from('profiles')
        .update({ pin })
        .eq('user_id', authData.user.id);
      
      // 4. Save nickname for auto-fill on next login
      localStorage.setItem(NICKNAME_STORAGE_KEY, name.trim());
      
      console.log('[AUTH] Registration complete!');
      setStep('success');
      
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      
    } catch (e) {
      console.error('[AUTH] Registration error:', e);
      setError('Erro inesperado ao registrar');
    }
    
    setIsLoading(false);
  }, [name, pin, selectedEmoji, inviteCode, navigate]);

  // ==================== LOGIN ====================
  
  const handleLogin = useCallback(async () => {
    setError(null);
    
    if (!loginNickname.trim()) {
      setError('Digite seu nickname');
      return;
    }
    
    if (loginPin.length !== 4) {
      setError('PIN deve ter 4 dígitos');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const fakeEmail = makeAuthEmail(loginNickname);
      const password = makePinPassword(loginPin);
      
      console.log('[AUTH] Logging in:', loginNickname.trim().substring(0, 3) + '...');
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password
      });
      
      if (signInError) {
        console.error('[AUTH] Login error:', signInError);
        setError('Nickname ou PIN incorretos');
        setIsLoading(false);
        return;
      }
      
      if (data.user) {
        // Verify profile exists
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
    } catch (e) {
      console.error('[AUTH] Login error:', e);
      setError('Erro inesperado ao fazer login');
    }
    
    setIsLoading(false);
  }, [loginNickname, loginPin, navigate]);

  // ==================== RENDER ====================
  
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${universeBg})` }}
      />
      <div className="fixed inset-0 bg-black/80" />
      
      <FloatingParticles />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <motion.div 
          className="text-center mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <ShimmerLogo />
          <motion.p 
            className="text-muted-foreground mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Entre no universo competitivo
          </motion.p>
        </motion.div>
        
        {/* Mode Toggle */}
        {step === 'invite' && (
          <motion.div 
            className="flex gap-2 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant={mode === 'login' ? 'default' : 'outline'}
              onClick={() => { setMode('login'); setError(null); }}
              className="flex-1 transition-all duration-300"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Entrar
            </Button>
            <Button
              variant={mode === 'register' ? 'default' : 'outline'}
              onClick={() => { setMode('register'); setError(null); }}
              className="flex-1 transition-all duration-300"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Jogador
            </Button>
          </motion.div>
        )}
        
        <AnimatePresence mode="wait">
          {/* ==================== LOGIN ==================== */}
          {mode === 'login' && step === 'invite' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl"
            >
              <GlowEffect />
              
              <motion.div 
                className="flex items-center gap-3 mb-6"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div 
                  className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <LogIn className="w-6 h-6 text-secondary" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Bem-vindo de volta!</h2>
                  <p className="text-sm text-muted-foreground">Digite seu nickname e senha de 4 dígitos</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="space-y-5"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={itemVariants}>
                  <label className="text-sm text-muted-foreground mb-2 block">Nickname</label>
                  <div className="relative group">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      type="text"
                      placeholder="Seu nickname"
                      value={loginNickname}
                      onChange={(e) => setLoginNickname(e.target.value)}
                      className={`${inputClassName} pl-10`}
                      maxLength={15}
                      autoComplete="username"
                    />
                  </div>
                </motion.div>
                
                <PinInput 
                  value={loginPin} 
                  onChange={setLoginPin} 
                  label="Senha de 4 dígitos" 
                />
                
                {error && <ErrorMessage message={error} />}
                
                <ActionButton
                  onClick={handleLogin}
                  disabled={!loginNickname.trim() || loginPin.length !== 4}
                  isLoading={isLoading}
                >
                  <>
                    Entrar
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                </ActionButton>
              </motion.div>
            </motion.div>
          )}
          
          {/* ==================== REGISTER - Step 1: Invite Code ==================== */}
          {mode === 'register' && step === 'invite' && (
            <motion.div
              key="register-invite"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl"
            >
              <GlowEffect />
              
              <motion.div 
                className="flex items-center gap-3 mb-6"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div 
                  className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Ticket className="w-6 h-6 text-primary" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Novo Jogador</h2>
                  <p className="text-sm text-muted-foreground">Código de convite obrigatório</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="space-y-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={itemVariants}>
                  <label className="text-sm text-muted-foreground mb-2 block">Código de Convite</label>
                  <Input
                    type="text"
                    placeholder="Ex: SKEMA2024"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className={`${inputClassName} text-center text-lg tracking-wider`}
                    maxLength={15}
                    autoFocus
                  />
                </motion.div>
                
                {error && <ErrorMessage message={error} />}
                
                <ActionButton
                  onClick={handleValidateCode}
                  disabled={inviteCode.length < 4}
                  isLoading={isLoading}
                >
                  <>
                    Validar Código
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                </ActionButton>
              </motion.div>
              
              <motion.div 
                className="mt-6 pt-6 border-t border-border/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-xs text-muted-foreground text-center">
                  Não tem um código? Peça para um amigo que já está no SKEMA!
                </p>
              </motion.div>
            </motion.div>
          )}
          
          {/* ==================== REGISTER - Step 2: Profile + PIN ==================== */}
          {mode === 'register' && step === 'profile' && (
            <motion.div
              key="register-profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl"
            >
              <GlowEffect />
              
              <motion.div 
                className="flex items-center gap-3 mb-6"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div 
                  className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <Check className="w-6 h-6 text-success" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Código Válido!</h2>
                  <p className="text-sm text-muted-foreground">
                    {inviterName 
                      ? `Convidado por ${inviterName}`
                      : 'Agora crie seu perfil'
                    }
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="space-y-5"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Emoji selector */}
                <motion.div variants={itemVariants}>
                  <label className="text-sm text-muted-foreground mb-2 block">Escolha seu avatar</label>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {AVAILABLE_EMOJIS.map((emoji, index) => (
                      <motion.button
                        key={emoji}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.15, rotate: 10 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`
                          w-12 h-12 rounded-full text-2xl flex items-center justify-center transition-all
                          ${selectedEmoji === emoji 
                            ? 'bg-primary/30 ring-2 ring-primary shadow-lg shadow-primary/20' 
                            : 'bg-muted/30 hover:bg-muted/50'
                          }
                        `}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
                
                {/* Nickname */}
                <motion.div variants={itemVariants}>
                  <label className="text-sm text-muted-foreground mb-2 block">Escolha seu nickname</label>
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl shrink-0"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {selectedEmoji}
                    </motion.div>
                    <Input
                      type="text"
                      placeholder="Seu nickname único"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClassName}
                      maxLength={15}
                      autoComplete="off"
                    />
                  </div>
                </motion.div>
                
                {/* PIN */}
                <PinInput 
                  value={pin} 
                  onChange={setPin} 
                  label="Crie sua senha de 4 dígitos" 
                />
                
                {/* Warning */}
                <motion.div 
                  variants={itemVariants}
                  className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-2"
                >
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-foreground/80">
                    <strong>Lembre do seu nickname e senha!</strong> É só isso que você precisa pra voltar.
                  </p>
                </motion.div>
                
                {error && <ErrorMessage message={error} />}
                
                {/* Tier Benefits */}
                <TierBenefitsCard 
                  inviterTier={inviterTier} 
                  inviterIsGuardian={inviterIsGuardian} 
                />
                
                <ActionButton
                  onClick={handleRegister}
                  disabled={name.trim().length < 2 || pin.length !== 4}
                  isLoading={isLoading}
                >
                  <>
                    Entrar no SKEMA
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                </ActionButton>
                
                <Button
                  variant="ghost"
                  onClick={() => { setStep('invite'); setError(null); }}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Voltar
                </Button>
              </motion.div>
            </motion.div>
          )}
          
          {/* ==================== SUCCESS ==================== */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-card/60 backdrop-blur-xl border border-success/30 rounded-2xl p-6 shadow-2xl"
            >
              <GlowEffect />
              
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-success to-primary flex items-center justify-center mx-auto mb-4"
                >
                  <Check className="w-10 h-10 text-success-foreground" />
                </motion.div>
                <motion.h2 
                  className="text-2xl font-bold text-foreground"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Bem-vindo ao SKEMA!
                </motion.h2>
                <motion.p 
                  className="text-muted-foreground mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Sua conta foi criada com sucesso
                </motion.p>
                <motion.p 
                  className="text-muted-foreground/60 text-sm mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Redirecionando...
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
