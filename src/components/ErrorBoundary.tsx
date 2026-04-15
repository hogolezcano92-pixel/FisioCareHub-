import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-rose-500/10 text-rose-400 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Ops! Algo deu errado</h1>
              <p className="text-slate-400 font-medium leading-relaxed">
                Ocorreu um erro inesperado na aplicação. Nossa equipe já foi notificada.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="p-4 bg-black/40 rounded-2xl text-left overflow-auto max-h-40 border border-white/5">
                <code className="text-xs text-rose-400 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-slate-900 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl shadow-white/10"
              >
                <RefreshCcw size={20} />
                Recarregar
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 text-white rounded-2xl font-black border border-white/10 hover:bg-white/10 transition-all"
              >
                <Home size={20} />
                Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
