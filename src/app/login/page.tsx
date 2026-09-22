"use client";

import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Credenciales inválidas. Por favor intenta de nuevo.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0d1527] overflow-hidden font-secondary">
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 md:w-96 h-72 md:h-96 rounded-full bg-[#1F3D64]/30 blur-[80px] md:blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 md:w-96 h-72 md:h-96 rounded-full bg-[#F59C1D]/10 blur-[80px] md:blur-[120px] pointer-events-none animate-pulse"></div>

      {/* Grid Pattern overlay for depth */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-[420px] p-8 md:p-10 mx-4 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-20 h-20 mb-4 flex items-center justify-center p-3 rounded-2xl bg-slate-800/40 border border-white/5 shadow-inner">
            <img 
              src="/identity/identity_logo_ISOTIPO.png" 
              alt="Mar de Java Isotipo Logo"
              className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(245,156,29,0.25)]"
            />
          </div>
          <h2 className="text-xl font-bold font-primary text-white tracking-wide uppercase">
            Ingreso al Sistema
          </h2>
          <p className="text-gray-400 text-[10px] tracking-wider uppercase font-semibold opacity-60 mt-1">
            Showroom Virtual - Mar de Java
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control w-full">
            <label className="label py-1" htmlFor="email">
              <span className="label-text text-gray-300 font-bold text-xs uppercase tracking-wider">Email</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="email@ejemplo.com"
                className="input input-bordered w-full pl-10 bg-slate-800/30 border-white/10 text-white placeholder-gray-500 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange text-sm transition-all rounded-xl h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label py-1" htmlFor="current-password">
              <span className="label-text text-gray-300 font-bold text-xs uppercase tracking-wider">Contraseña</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="current-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="input input-bordered w-full pl-10 pr-10 bg-slate-800/30 border-white/10 text-white placeholder-gray-500 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange text-sm transition-all rounded-xl h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error bg-red-950/40 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="form-control pt-4">
            <button 
              type="submit" 
              className="btn w-full h-11 min-h-[44px] bg-brand-orange hover:bg-brand-dark-orange text-white border-none font-bold tracking-wider uppercase text-sm rounded-xl transition-all shadow-[0_4px_20px_rgba(245,156,29,0.2)] hover:shadow-[0_6px_25px_rgba(245,156,29,0.3)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
