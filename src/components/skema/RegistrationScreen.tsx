/**
 * RegistrationScreen - Tela de registro por convite
 * 
 * Fluxo:
 * 1. Jogador insere código de convite
 * 2. Escolhe nome e emoji
 * 3. Recebe k$10 inicial
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, User, Sparkles, ArrowRight, Check, AlertCircle,
  Zap, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import universeBg from '@/assets/universe-bg.jpg';

interface RegistrationScreenProps {
  onRegister: (name: string, inviteCode: string, emoji: string) => { success: boolean; error?: string };
  validateCode: (code: string) => { valid: boolean; inviterId: string | null };
  initialInviteCode?: string;
}

const AVAILABLE_EMOJIS = ['🎮', '🚀', '⚡', '🔥', '💎', '🌟', '🎯', '👾', '🤖', '🧠', '💜', '🎲'];

export function RegistrationScreen({ onRegister, validateCode, initialInviteCode = '' }: RegistrationScreenProps) {
  const [step, setStep] = useState<'invite' | 'profile'>('invite');
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎮');
  const [error, setError] = useState<string | null>(null);
  const [isValidCode, setIsValidCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sincroniza código da URL quando prop muda
  useEffect(() => {
    if (initialInviteCode && initialInviteCode !== inviteCode) {
      setInviteCode(initialInviteCode);
    }
  }, [initialInviteCode]);

  const handleValidateCode = useCallback(() => {
    setError(null);
    const result = validateCode(inviteCode);
    
    if (result.valid) {
      setIsValidCode(true);
      setStep('profile');
    } else {
      setError('Código de convite inválido');
      setIsValidCode(false);
    }
  }, [inviteCode, validateCode]);

  const handleRegister = useCallback(() => {
    setError(null);
    setIsLoading(true);
    
    setTimeout(() => {
      const result = onRegister(name, inviteCode, selectedEmoji);
      
      if (!result.success) {
        setError(result.error || 'Erro ao registrar');
        setIsLoading(false);
      }
    }, 500);
  }, [name, inviteCode, selectedEmoji, onRegister]);

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
          {step === 'invite' ? (
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
          ) : (
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
                  <p className="text-sm text-white/50">Agora crie seu perfil</p>
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
                  disabled={name.length < 2 || isLoading}
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
                      Entrar no SKEMA
                      <ArrowRight className="w-4 h-4 ml-2" />
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
