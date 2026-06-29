import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/auth-context'
import { Logo } from '@/components/Logo'
import { ModeToggle } from '@/components/mode-toggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isSupabaseConfigured } from '@/lib/supabase'

interface LocationState {
  from?: { pathname?: string }
}

export function LoginPage() {
  const { user, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/'

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No pudimos iniciar la sesión. Intentá nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-[#111113] p-10 text-white lg:flex lg:flex-col" aria-label="Presentación de Koi Office">
        <Logo inverse />
        <div className="absolute top-0 right-0 h-full w-1 bg-primary" />
        <div className="my-auto max-w-xl">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">Tu agencia, en foco</span>
          <h1 className="mt-5 text-6xl font-semibold leading-[0.95] tracking-[-0.065em]">Todo el trabajo.<br /><span className="text-primary">Una sola vista.</span></h1>
          <p className="mt-6 max-w-md text-sm leading-6 text-zinc-400">Clientes, proyectos y números claros para dedicar menos tiempo a ordenar y más a construir.</p>
          <div className="mt-12 grid grid-cols-2 gap-3">
            <Card className="border-white/10 bg-white/[0.045] py-0 text-white shadow-none"><CardContent className="p-4"><span className="text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">Operación centralizada</span><strong className="mt-3 block text-sm font-medium">Clientes, proyectos y tareas</strong><div className="mt-4 h-1 overflow-hidden rounded-full bg-white/8"><i className="block h-full w-full bg-primary" /></div></CardContent></Card>
            <Card className="border-white/10 bg-white/[0.045] py-0 text-white shadow-none"><CardContent className="p-4"><span className="text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">Acceso seguro</span><strong className="mt-3 block font-mono text-xl">RLS</strong><small className="mt-2 block text-[10px] text-zinc-500">Permisos por rol</small></CardContent></Card>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600">Koi Software · Uso interno</p>
      </section>

      <section className="relative grid place-items-center p-6 sm:p-10">
        <div className="absolute top-4 right-4"><ModeToggle /></div>
        <div className="w-full max-w-sm">
          <div className="mb-8 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="size-5" /></div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">Acceso al equipo</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">Bienvenido de nuevo</h2>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">Ingresá con tu cuenta de Koi para continuar.</p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" placeholder="nombre@koi.dev" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={!isSupabaseConfigured} /></div>
            <div className="grid gap-2"><Label htmlFor="password">Contraseña</Label><div className="relative"><Input className="pr-10" id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={!isSupabaseConfigured} /><Button className="absolute top-1/2 right-1 -translate-y-1/2" type="button" variant="ghost" size="icon-sm" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div></div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <Button className="h-10 w-full" type="submit" disabled={isSubmitting || !isSupabaseConfigured}>{isSubmitting ? 'Ingresando…' : 'Ingresar'}{!isSubmitting && <ArrowRight className="size-4" />}</Button>
          </form>
        </div>
      </section>
    </main>
  )
}
