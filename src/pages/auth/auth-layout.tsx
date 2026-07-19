import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MessageCircle, Sparkles, Shield, Zap } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { Moon, Sun } from 'lucide-react';

export function AuthLayout() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isRegister = location.pathname.includes('register');

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left panel — brand / features (hidden on small screens) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-emerald-700 p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ChatWave</h1>
            <p className="text-sm text-white/80">Real-time conversations, reimagined.</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            Talk freely. <br /> Anywhere, anytime, with anyone.
          </h2>
          <ul className="space-y-4">
            {[
              { icon: Zap, title: 'Real-time delivery', desc: 'Messages arrive instantly with typing indicators & read receipts.' },
              { icon: Shield, title: 'End-to-end secure', desc: 'Row-level security on every table — only you and your peers see your chats.' },
              { icon: Sparkles, title: 'Rich media', desc: 'Send images, videos, audio, and documents with previews.' },
            ].map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/80">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-white/70">© {new Date().getFullYear()} ChatWave. Built with Supabase Realtime.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full flex-col lg:w-1/2">
        <header className="flex items-center justify-between p-4 lg:p-6">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight">ChatWave</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-foreground transition-colors hover:bg-accent"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="hidden items-center gap-1 rounded-lg border p-1 sm:flex">
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`
                }
              >
                Sign in
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`
                }
              >
                Sign up
              </NavLink>
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 pb-10">
          <div className="w-full max-w-md">
            <Outlet />
            <p className="mt-6 text-center text-xs text-muted-foreground">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <NavLink
                to={isRegister ? '/login' : '/register'}
                className="font-medium text-primary hover:underline"
              >
                {isRegister ? 'Sign in' : 'Create one'}
              </NavLink>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
