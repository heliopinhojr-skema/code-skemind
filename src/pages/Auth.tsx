/**
 * Auth - Página de autenticação Supabase
 * 
 * Fluxos:
 * 1. Registro: email + senha + código de convite obrigatório → cria profile
 * 2. Login: email + senha → restaura sessão
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, Sparkles, ArrowRight, Check, AlertCircle,
  Zap, Gift, Lock, Eye, EyeOff, LogIn, UserPlus, Mail,
  Crown, Shield, Star, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import universeBg from '@/assets/universe-bg.jpg';

// Códigos de convite master (para primeiros jogadores)
const MASTER_INVITE_CODES = ['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];

const AVAILABLE_EMOJIS = ['🎮', '🚀', '⚡', '🔥', '💎', '🌟', '🎯', '👾', '🤖', '🧠', '💜', '🎲'];

// Animation variants for stagger effect
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

// Floating particles component
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

// Pulsing glow behind card
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

// Shimmer logo component
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

// Input class with corrected colors
const inputClassName = "bg-card/80 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 transition-all duration-200";

// Tier benefits configuration
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
  // Master Admin convida → Guardião
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
  
  // Guardião convida → Grão Mestre
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
  
  // Grão Mestre convida → Mestre
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
  
  // Mestre ou Jogador convida → Jogador
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

// Tier Benefits Card Component
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
      
      {/* Tier badge */}
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

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialInviteCode = searchParams.get('convite') || searchParams.get('invite') || '';
  
  // Se vier com código de convite, abre direto na aba de registro
  const [mode, setMode] = useState<'login' | 'register'>(initialInviteCode ? 'register' : 'login');
  const [step, setStep] = useState<'credentials' | 'profile' | 'success'>('credentials');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState(initialInviteCode.toUpperCase());
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎮');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidCode, setIsValidCode] = useState(false);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [inviterTier, setInviterTier] = useState<string | null>(null);
  const [inviterIsGuardian, setInviterIsGuardian] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Check if user has a profile
        checkProfileAndRedirect(session.user.id);
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

  // Validate invite code using RPC (works for anonymous users)
  const validateInviteCode = useCallback(async (code: string): Promise<{ 
    valid: boolean; 
    inviterId: string | null; 
    inviterName?: string;
    inviterTier?: string;
    inviterIsGuardian?: boolean;
  }> => {
    // Call the SECURITY DEFINER function that bypasses RLS
    const { data, error } = await supabase.rpc('validate_invite_code', {
      p_code: code
    });
    
    if (error || !data) {
      console.error('[AUTH] validate_invite_code error:', error);
      return { valid: false, inviterId: null };
    }
    
    // Cast the JSONB response
    const result = data as {
      valid: boolean;
      inviter_id: string | null;
      inviter_name: string | null;
      inviter_tier: string | null;
      inviter_is_guardian: boolean;
    };
    
    return {
      valid: result.valid === true,
      inviterId: result.inviter_id || null,
      inviterName: result.inviter_name || undefined,
      inviterTier: result.inviter_tier || undefined,
      inviterIsGuardian: result.inviter_is_guardian === true
    };
  }, []);

  const handleValidateCode = useCallback(async () => {
    setError(null);
    const trimmedCode = inviteCode.trim().toUpperCase();
    
    console.log('[AUTH] Validating invite code:', trimmedCode);
    
    if (trimmedCode.length < 4) {
      setError('Código muito curto');
      return;
    }
    
    setIsLoading(true);
    const result = await validateInviteCode(trimmedCode);
    setIsLoading(false);
    
    console.log('[AUTH] Validation result:', {
      valid: result.valid,
      inviterName: result.inviterName,
      inviterTier: result.inviterTier,
      inviterIsGuardian: result.inviterIsGuardian
    });
    
    if (result.valid) {
      setIsValidCode(true);
      setInviterName(result.inviterName || null);
      setInviterTier(result.inviterTier || null);
      setInviterIsGuardian(result.inviterIsGuardian || false);
      setStep('profile');
    } else {
      setError('Código de convite inválido');
      setIsValidCode(false);
    }
  }, [inviteCode, validateInviteCode]);

  const handleRegister = useCallback(async () => {
    setError(null);
    
    if (name.length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres');
      return;
    }
    
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    console.log('[AUTH] Starting registration for:', {
      name,
      emoji: selectedEmoji,
      inviteCode: inviteCode.toUpperCase(),
      inviterTier,
      inviterIsGuardian
    });
    
    setIsLoading(true);
    
    try {
      // 1. Sign up with Supabase Auth
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (signUpError) {
        console.error('[AUTH] SignUp error:', signUpError);
        if (signUpError.message.includes('already registered')) {
          setError('Este email já está cadastrado. Faça login.');
        } else {
          setError(signUpError.message);
        }
        setIsLoading(false);
        return;
      }
      
      if (!authData.user) {
        console.error('[AUTH] No user returned from signUp');
        setError('Erro ao criar conta');
        setIsLoading(false);
        return;
      }
      
      console.log('[AUTH] Auth user created:', authData.user.id);
      
      // 2. Create profile using the database function
      console.log('[AUTH] Calling register_player RPC with:', {
        p_name: name,
        p_emoji: selectedEmoji,
        p_invite_code: inviteCode.toUpperCase()
      });
      
      const { data: profile, error: profileError } = await supabase.rpc('register_player', {
        p_name: name,
        p_emoji: selectedEmoji,
        p_invite_code: inviteCode.toUpperCase()
      });
      
      if (profileError) {
        console.error('[AUTH] Profile creation error:', profileError);
        setError('Erro ao criar perfil: ' + profileError.message);
        setIsLoading(false);
        return;
      }
      
      console.log('[AUTH] Profile created successfully:', {
        id: profile?.id,
        name: profile?.name,
        player_tier: profile?.player_tier,
        energy: profile?.energy,
        invited_by: profile?.invited_by,
        invited_by_name: profile?.invited_by_name
      });
      
      setStep('success');
      
      // Redirect after success
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      
    } catch (e) {
      console.error('[AUTH] Registration error:', e);
      setError('Erro inesperado ao registrar');
    }
    
    setIsLoading(false);
  }, [email, password, name, selectedEmoji, inviteCode, inviterTier, inviterIsGuardian, navigate]);

  const handleLogin = useCallback(async () => {
    setError(null);
    
    if (!email || !password) {
      setError('Preencha email e senha');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else {
          setError(signInError.message);
        }
        setIsLoading(false);
        return;
      }
      
      if (data.user) {
        // Check if user has profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .single();
        
        if (profile) {
          navigate('/', { replace: true });
        } else {
          // User exists but no profile - should register
          setError('Conta incompleta. Por favor, registre-se novamente.');
          await supabase.auth.signOut();
        }
      }
    } catch (e) {
      console.error('Login error:', e);
      setError('Erro inesperado ao fazer login');
    }
    
    setIsLoading(false);
  }, [email, password, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${universeBg})` }}
      />
      <div className="fixed inset-0 bg-black/80" />
      
      {/* Floating particles */}
      <FloatingParticles />
      
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo with shimmer */}
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
        
        {/* Toggle Login/Register with animation */}
        {step === 'credentials' && (
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
              Criar Conta
            </Button>
          </motion.div>
        )}
        
        <AnimatePresence mode="wait">
          {/* LOGIN */}
          {mode === 'login' && step === 'credentials' && (
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
                  <h2 className="text-lg font-bold text-foreground">Entrar na Conta</h2>
                  <p className="text-sm text-muted-foreground">Use seu email e senha</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="space-y-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={itemVariants}>
                  <label className="text-sm text-muted-foreground mb-2 block">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${inputClassName} pl-10`}
                    />
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <label className="text-sm text-muted-foreground mb-2 block">Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClassName} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
                
                <motion.div variants={itemVariants}>
                  <Button
                    onClick={handleLogin}
                    disabled={!email || !password || isLoading}
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
                      <>
                        Entrar
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
          
          {/* REGISTER - Step 1: Credentials + Invite Code */}
          {mode === 'register' && step === 'credentials' && (
            <motion.div
              key="register-credentials"
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
                  <h2 className="text-lg font-bold text-foreground">Criar Conta</h2>
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
                  <label className="text-sm text-muted-foreground mb-2 block">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${inputClassName} pl-10`}
                    />
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <label className="text-sm text-muted-foreground mb-2 block">Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClassName} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <label className="text-sm text-muted-foreground mb-2 block">Código de Convite</label>
                  <Input
                    type="text"
                    placeholder="Ex: SKEMA2024"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className={`${inputClassName} text-center text-lg tracking-wider`}
                    maxLength={15}
                  />
                </motion.div>
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
                
                <motion.div variants={itemVariants}>
                  <Button
                    onClick={handleValidateCode}
                    disabled={!email || password.length < 6 || inviteCode.length < 4 || isLoading}
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
                      <>
                        Validar Código
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
              
              {/* Dicas */}
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
          
          {/* REGISTER - Step 2: Profile */}
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
                className="space-y-6"
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
                
                {/* Nome */}
                <motion.div variants={itemVariants}>
                  <label className="text-sm text-muted-foreground mb-2 block">Seu nome</label>
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
                      placeholder="Escolha um nome único"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClassName}
                      maxLength={15}
                    />
                  </div>
                </motion.div>
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
                
                {/* Benefícios personalizados por tier */}
                <TierBenefitsCard 
                  inviterTier={inviterTier} 
                  inviterIsGuardian={inviterIsGuardian} 
                />
                
                <motion.div variants={itemVariants}>
                  <Button
                    onClick={handleRegister}
                    disabled={name.length < 2 || isLoading}
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
                      <>
                        Criar Conta
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </motion.div>
                
                <Button
                  variant="ghost"
                  onClick={() => setStep('credentials')}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Voltar
                </Button>
              </motion.div>
            </motion.div>
          )}
          
          {/* SUCCESS */}
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
