import { GENERATION_COLORS, PlanetFace } from '@/components/skema/GenerationColorPicker';

export default function DemoFaces() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold text-foreground mb-2 text-center">PlanetFace — Variants Demo</h1>
      <p className="text-muted-foreground text-center mb-8 text-sm">Todas as 10 cores com os dois variants: Open (olhos abertos) e Closed (olhos fechados)</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 max-w-4xl mx-auto">
        {GENERATION_COLORS.map(color => (
          <div key={color.id} className="flex flex-col items-center gap-3">
            <p className="text-xs text-muted-foreground font-medium">{color.name}</p>
            <div className="flex gap-4">
              {/* Open variant */}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${color.bg} ${color.glow}`}>
                  <PlanetFace className={color.face} variant="open" size="w-11 h-11" />
                </div>
                <span className="text-[10px] text-muted-foreground">open</span>
              </div>
              {/* Closed variant */}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${color.bg} ${color.glow}`}>
                  <PlanetFace className={color.face} variant="closed" size="w-11 h-11" />
                </div>
                <span className="text-[10px] text-muted-foreground">closed</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Large preview */}
      <div className="mt-12 flex justify-center gap-12">
        <div className="flex flex-col items-center gap-2">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center ${GENERATION_COLORS[0].bg} ${GENERATION_COLORS[0].glow}`}>
            <PlanetFace className={GENERATION_COLORS[0].face} variant="open" size="w-24 h-24" />
          </div>
          <span className="text-sm text-foreground font-medium">Open — Grande</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center ${GENERATION_COLORS[5].bg} ${GENERATION_COLORS[5].glow}`}>
            <PlanetFace className={GENERATION_COLORS[5].face} variant="closed" size="w-24 h-24" />
          </div>
          <span className="text-sm text-foreground font-medium">Closed — Grande</span>
        </div>
      </div>
    </div>
  );
}
