/**
 * RegistrationScreen - Tela de registro/login por convite
 * 
 * Fluxo:
 * 1. Escolher: Novo registro OU Login
 * 2. Novo: inserir código de convite → nome + emoji + senha
 * 3. Login: inserir código do jogador + senha
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, User, Sparkles, ArrowRight, Check, AlertCircle,
  Zap, Gift, Lock, LogIn, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import universeBg from '@/assets/universe-bg.jpg';

interface RegistrationScreenProps {
  onRegister: (name: string, inviteCode: string, emoji: string, password: string) => { success: boolean; error?: string };
  onLogin: (playerCode: string, password: string) => { success: boolean; error?: string };
  validateCode: (code: string) => { valid: boolean; inviterId: string | null; inviterName?: string };
  initialInviteCode?: string;
}

const AVAILABLE_EMOJIS = ['🎮', '🚀', '⚡', '🔥', '💎', '🌟', '🎯', '👾', '🤖', '🧠', '💜', '🎲'];

export function RegistrationScreen({ onRegister, onLogin, validateCode, initialInviteCode = '' }: RegistrationScreenProps) {
  const [mode, setMode] = useState<'choose' | 'invite' | 'profile' | 'login'>('choose');
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎮');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inviterName, setInviterName] = useState<string | null>(null);

  // Permite colar tanto o CÓDIGO (SKINVXXXXX) quanto o LINK inteiro (…/?convite=SKINVXXXXX)
  const extractSkemaInviteCode = useCallback((input: string) => {
    const raw = input.trim();
    if (!raw) return '';

    const upper = raw.toUpperCase();

    // 1) Match direto (funciona mesmo se o usuário colar texto com mais coisas)
    const directMatch = upper.match(/SKINV[A-Z0-9]{5}/);
    if (directMatch) return directMatch[0];

    // 2) Match por query (?convite=... / ?invite=...)
    const queryMatch = raw.match(/[?&](convite|invite)=([^&#]+)/i);
    if (queryMatch?.[2]) return decodeURIComponent(queryMatch[2]).trim().toUpperCase();

    // 3) Match por path (/convite/CODIGO ou /invite/CODIGO)
    const pathMatch = raw.match(/\/(convite|invite)\/([^/?#]+)/i);
    if (pathMatch?.[2]) return decodeURIComponent(pathMatch[2]).trim().toUpperCase();

    // 4) Fallback: deixa o que o usuário digitou
    return upper;
  }, []);

  // Se veio com código, vai direto pra validação
  useEffect(() => {
    if (initialInviteCode && initialInviteCode !== inviteCode) {
      setInviteCode(initialInviteCode);
    }
    if (initialInviteCode) {
      setMode('invite');
    }
  }, [initialInviteCode]);

  const handleValidateCode = useCallback(() => {
    setError(null);
    const trimmedCode = extractSkemaInviteCode(inviteCode);

    // Se o usuário colou o link inteiro, refletimos o código extraído no input.
    if (trimmedCode && trimmedCode !== inviteCode.trim().toUpperCase()) {
      setInviteCode(trimmedCode);
    }
    
    if (trimmedCode.length < 4) {
      setError('Código muito curto');
      return;
    }
    
    console.log('[SKEMA] 🔍 Validando código na UI:', trimmedCode);
    const result = validateCode(trimmedCode);
    console.log('[SKEMA] 📋 Resultado:', result);
    
    if (result.valid) {
      setInviterName(result.inviterName || null);
      setMode('profile');
    } else {
      // Mensagem mais específica
      if (trimmedCode.startsWith('SKINV')) {
        setError('Este código de convite já foi usado ou não existe.');
      } else if (trimmedCode.startsWith('SK')) {
        setError('Código de jogador não encontrado. Peça um SKINV ao inviter.');
      } else {
        setError('Código inválido. Use um código SKINVXXXXX de convite.');
      }
    }
  }, [inviteCode, validateCode, extractSkemaInviteCode]);

  const handleRegister = useCallback(() => {
    setError(null);
    
    if (password.length < 4) {
      setError('Senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    setIsLoading(true);
    
    setTimeout(() => {
      const normalizedInvite = extractSkemaInviteCode(inviteCode);
      if (normalizedInvite && normalizedInvite !== inviteCode.trim().toUpperCase()) {
        setInviteCode(normalizedInvite);
      }
      const result = onRegister(name, normalizedInvite || inviteCode, selectedEmoji, password);
      
      if (!result.success) {
        setError(result.error || 'Erro ao registrar');
        setIsLoading(false);
      }
    }, 500);
  }, [name, inviteCode, selectedEmoji, password, onRegister, extractSkemaInviteCode]);

  const handleLogin = useCallback(() => {
    setError(null);
    
    if (loginCode.length < 4) {
      setError('Código inválido');
      return;
    }
    
    if (loginPassword.length < 4) {
      setError('Senha inválida');
      return;
    }
    
    setIsLoading(true);
    
    setTimeout(() => {
      const result = onLogin(loginCode, loginPassword);
      
      if (!result.success) {
        setError(result.error || 'Erro ao entrar');
        setIsLoading(false);
      }
    }, 500);
  }, [loginCode, loginPassword, onLogin]);

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
        
        <AnimatePresence mode="wait">
          {/* Escolha: Novo ou Login */}
          {mode === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Bem-vindo!</h2>
                <p className="text-sm text-white/50 mt-1">Como deseja entrar?</p>
              </div>
              
              <Button
                onClick={() => setMode('invite')}
                className="w-full h-14 text-lg gap-3"
                variant="default"
              >
                <UserPlus className="w-5 h-5" />
                Tenho um Convite
              </Button>
              
              <Button
                onClick={() => setMode('login')}
                className="w-full h-14 text-lg gap-3"
                variant="outline"
              >
                <LogIn className="w-5 h-5" />
                Já Tenho Conta
              </Button>
              
              <p className="text-xs text-white/40 text-center pt-4">
                Não tem convite? Peça para um amigo que já está no SKEMA!
              </p>
            </motion.div>
          )}

          {/* Login */}
          {mode === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <LogIn className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Entrar</h2>
                  <p className="text-sm text-white/50">Use seu código e senha</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Seu Código</label>
                  <Input
                    type="text"
                    placeholder="Ex: SKXXXXXX"
                    value={loginCode}
                    onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/20 text-white text-center tracking-wider placeholder:text-white/30"
                    maxLength={15}
                  />
                </div>
                
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Senha</label>
                  <Input
                    type="password"
                    placeholder="Sua senha"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                    maxLength={20}
                  />
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
                
                <Button
                  variant="ghost"
                  onClick={() => { setMode('choose'); setError(null); }}
                  className="w-full text-white/50"
                >
                  Voltar
                </Button>
              </div>
            </motion.div>
          )}

          {/* Código de Convite */}
          {mode === 'invite' && (
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
                  placeholder="Ex: SKINVXXXXX"
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
                
                <Button
                  variant="ghost"
                  onClick={() => { setMode('choose'); setError(null); }}
                  className="w-full text-white/50"
                >
                  Voltar
                </Button>
              </div>
            </motion.div>
          )}

          {/* Criar Perfil */}
          {mode === 'profile' && (
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
              
              <div className="space-y-5">
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
                          w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all touch-manipulation
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
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xl shrink-0">
                      {selectedEmoji}
                    </div>
                    <Input
                      type="text"
                      placeholder="Nome único"
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
                    <Lock className="w-3 h-3" />
                    Crie uma senha (para voltar depois)
                  </label>
                  <Input
                    type="password"
                    placeholder="Mínimo 4 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                    maxLength={20}
                  />
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
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">Bônus de Boas-vindas</span>
                  </div>
                  <ul className="space-y-1 text-xs text-white/70">
                    <li className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      k$10 de energia inicial
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Refill diário gratuito
                    </li>
                  </ul>
                </div>
                
                <Button
                  onClick={handleRegister}
                  disabled={name.length < 2 || password.length < 4 || isLoading}
                  className="w-full h-14 text-lg touch-manipulation"
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
                      Entrar no SKEMA
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
