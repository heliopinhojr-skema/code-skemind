import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, Gamepad2, Info } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-cyan-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              SKEMIND
            </h1>
            <Sparkles className="w-8 h-8 text-pink-400" />
          </div>
          <p className="text-slate-400 text-lg">O jogo de lógica e dedução</p>
        </div>

        {/* Main Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <Gamepad2 className="w-10 h-10 text-cyan-400" />
            </div>
            <CardTitle className="text-2xl text-white">Bem-vindo!</CardTitle>
            <CardDescription className="text-slate-400">
              Decifre o código secreto de 4 símbolos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Game Rules */}
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-medium">
                <Info className="w-4 h-4" />
                <span>Como jogar</span>
              </div>
              <ul className="text-sm text-slate-400 space-y-1 ml-6">
                <li>• Escolha 4 símbolos únicos para seu palpite</li>
                <li>• ⚪ Branco = símbolo e posição corretos</li>
                <li>• ⚫ Cinza = símbolo correto, posição errada</li>
                <li>• Você tem 8 tentativas e 3 minutos</li>
              </ul>
            </div>

            {/* Symbol Preview */}
            <div className="flex justify-center gap-3 py-4">
              {['#E53935', '#1E88E5', '#43A047', '#FDD835', '#8E24AA', '#00BCD4'].map((color, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-lg shadow-lg"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-lg"
            >
              Iniciar Jogo
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Projeto SKEMIND • Jogo de Lógica
        </p>
      </div>
    </div>
  );
};

export default Index;
