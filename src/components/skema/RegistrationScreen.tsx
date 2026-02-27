/**
 * RegistrationScreen - Tela de registro/login por convite
 * 
 * Fluxos:
 * 1. Novo jogador: código de convite → nome + emoji + senha → recebe k$10
 * 2. Retorno: código do jogador + senha → restaura dados
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, User, Sparkles, ArrowRight, Check, AlertCircle,
  Zap, Gift, Lock, Eye, EyeOff, LogIn, UserPlus, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import universeBg from '@/assets/universe-bg.jpg';
import { copyToClipboard } from '@/lib/clipboardFallback';

interface RegistrationScreenProps {
  onRegister: (name: string, inviteCode: string, emoji: string, password?: string) => { success: boolean; error?: string; playerCode?: string };
  onLogin: (playerCode: string, password: string) => { success: boolean; error?: string };
  validateCode: (code: string) => { valid: boolean; inviterId: string | null; inviterName?: string };
  initialInviteCode?: string;
}

const AVAILABLE_EMOJIS = ['🎮', '🚀', '⚡', '🔥', '💎', '🌟', '🎯', '👾', '🤖', '🧠', '💜', '🎲'];

export function RegistrationScreen({ onRegister, onLogin, validateCode, initialInviteCode = '' }: RegistrationScreenProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState<'invite' | 'profile' | 'success'>('invite');
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🎮');
  const [error, setError] = useState<string | null>(null);
  const [isValidCode, setIsValidCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [newPlayerCode, setNewPlayerCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Login fields
  const [loginCode, setLoginCode] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sincroniza código da URL quando prop muda
  useEffect(() => {
    if (initialInviteCode && initialInviteCode !== inviteCode) {
      setInviteCode(initialInviteCode);
    }
  }, [initialInviteCode]);

  const handleValidateCode = useCallback(() => {
    setError(null);
    const trimmedCode = inviteCode.trim().toUpperCase();
    
    if (trimmedCode.length < 4) {
      setError('Código muito curto');
      return;
    }
    
    const result = validateCode(trimmedCode);
    console.log('[SKEMA] Validando código:', trimmedCode, result);
    
    if (result.valid) {
      setIsValidCode(true);
      setInviterName(result.inviterName || null);
      setStep('profile');
    } else {
      setError('Código de convite inválido');
      setIsValidCode(false);
    }
  }, [inviteCode, validateCode]);

  const handleRegister = useCallback(() => {
    setError(null);
    
    if (password.length < 4) {
      setError('Senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    setIsLoading(true);
    
    setTimeout(() => {
      const result = onRegister(name, inviteCode, selectedEmoji, password);
      
      if (result.success) {
        setNewPlayerCode(result.playerCode || null);
        setStep('success');
      } else {
        setError(result.error || 'Erro ao registrar');
      }
      setIsLoading(false);
    }, 500);
  }, [name, inviteCode, selectedEmoji, password, onRegister]);

  const handleLogin = useCallback(() => {
    setError(null);
    
    if (loginCode.length < 4) {
      setError('Código do jogador inválido');
      return;
    }
    
    if (loginPassword.length < 4) {
      setError('Senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    setIsLoading(true);
    
    setTimeout(() => {
      const result = onLogin(loginCode, loginPassword);
      
      if (!result.success) {
        setError(result.error || 'Erro ao fazer login');
      }
      setIsLoading(false);
    }, 500);
  }, [loginCode, loginPassword, onLogin]);

  const handleCopyCode = useCallback(async () => {
    if (!newPlayerCode) return;
    const ok = await copyToClipboard(newPlayerCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }, [newPlayerCode]);

  const handleContinueToLobby = useCallback(() => {
    // Força reload para entrar no lobby
    window.location.reload();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${universeBg})` }}
      />
      <div className="fixed inset-0 bg-black/80" />
      
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <motion.div 
          className="text-center mb-8"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            SKEMA
          </h1>
          <p className="text-white/60 mt-2">Entre no universo competitivo</p>
        </motion.div>
        
        {/* Toggle Register/Login */}
        {step === 'invite' && (
          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === 'register' ? 'default' : 'outline'}
              onClick={() => { setMode('register'); setError(null); }}
              className="flex-1"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Jogador
            </Button>
            <Button
              variant={mode === 'login' ? 'default' : 'outline'}
              onClick={() => { setMode('login'); setError(null); }}
              className="flex-1"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Já Tenho Conta
            </Button>
          </div>
        )}
        
        <AnimatePresence mode="wait">
          {/* LOGIN MODE */}
          {mode === 'login' && step === 'invite' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <LogIn className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Entrar na Conta</h2>
                  <p className="text-sm text-white/50">Use seu código e senha</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Seu Código (SK...)</label>
                  <Input
                    type="text"
                    placeholder="Ex: SKAB1234"
                    value={loginCode}
                    onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/20 text-white text-center text-lg tracking-wider placeholder:text-white/30"
                    maxLength={10}
                  />
                </div>
                
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Senha</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sua senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="bg-white/5 border-white/20 text-white pr-10"
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
                
                <Button
                  onClick={handleLogin}
                  disabled={loginCode.length < 4 || loginPassword.length < 4 || isLoading}
                  className="w-full h-12"
                >
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
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
          
          {/* REGISTER MODE - Step 1: Invite Code */}
          {mode === 'register' && step === 'invite' && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Código de Convite</h2>
                  <p className="text-sm text-white/50">Insira seu código para entrar</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Ex: SKEMA2024"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="bg-white/5 border-white/20 text-white text-center text-lg tracking-wider placeholder:text-white/30"
                  maxLength={15}
                />
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
                
                <Button
                  onClick={handleValidateCode}
                  disabled={inviteCode.length < 4}
                  className="w-full h-12"
                >
                  Validar Código
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              {/* Dicas */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs text-white/40 text-center">
                  Não tem um código? Peça para um amigo que já está no SKEMA!
                </p>
              </div>
            </motion.div>
          )}
          
          {/* REGISTER MODE - Step 2: Profile + Password */}
          {mode === 'register' && step === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Código Válido!</h2>
                  <p className="text-sm text-white/50">
                    {inviterName 
                      ? `Convidado por ${inviterName}`
                      : 'Agora crie seu perfil'
                    }
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Emoji selector */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Escolha seu avatar</label>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {AVAILABLE_EMOJIS.map((emoji) => (
                      <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`
                          w-12 h-12 rounded-full text-2xl flex items-center justify-center transition-all
                          ${selectedEmoji === emoji 
                            ? 'bg-primary/30 ring-2 ring-primary' 
                            : 'bg-white/5 hover:bg-white/10'
                          }
                        `}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                {/* Nome */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Seu nome</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-2xl shrink-0">
                      {selectedEmoji}
                    </div>
                    <Input
                      type="text"
                      placeholder="Escolha um nome único"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                      maxLength={15}
                    />
                  </div>
                </div>
                
                {/* Senha */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Crie uma senha (para entrar depois)
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 4 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/5 border-white/20 text-white pr-10"
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    Guarde bem! Você precisará para entrar novamente.
                  </p>
                </div>
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
                
                {/* Benefícios */}
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-5 h-5 text-yellow-400" />
                    <span className="font-medium text-yellow-400">Bônus de Boas-vindas</span>
                  </div>
                  <ul className="space-y-2 text-sm text-white/70">
                    <li className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      k$10 de energia inicial
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Refill diário gratuito
                    </li>
                  </ul>
                </div>
                
                <Button
                  onClick={handleRegister}
                  disabled={name.length < 2 || password.length < 4 || isLoading}
                  className="w-full h-12"
                >
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
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
          
          {/* SUCCESS - Show Player Code */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-black/50 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6"
            >
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4"
                >
                  <Check className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Bem-vindo ao SKEMA!</h2>
                <p className="text-white/60 mt-2">Sua conta foi criada com sucesso</p>
              </div>
              
              {/* Player Code Display */}
              <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-xl p-4 mb-6">
                <div className="text-center">
                  <p className="text-sm text-white/60 mb-2">Seu código de jogador:</p>
                  <div className="flex items-center justify-center gap-3">
                    <code className="text-2xl font-bold text-primary tracking-wider">
                      {newPlayerCode}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyCode}
                      className="text-white/50 hover:text-white"
                    >
                      {copiedCode ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-white/80">
                    <strong className="text-yellow-400">Importante!</strong>
                    <p className="mt-1">
                      Anote seu código <strong>{newPlayerCode}</strong> e sua senha. 
                      Você precisará deles para entrar novamente.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleContinueToLobby}
                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                Entrar no SKEMA
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
