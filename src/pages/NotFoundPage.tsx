import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6 text-center">
      <div>
        <span className="font-mono text-sm font-semibold tracking-[0.3em] text-primary">404</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Esta página se fue a nadar.</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">No encontramos la ruta que buscabas.</p>
        <Button asChild><Link to="/"><ArrowLeft className="size-4" /> Volver al resumen</Link></Button>
      </div>
    </main>
  )
}
