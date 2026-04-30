import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  Send, 
  User, 
  Loader2, 
  MessageSquare, 
  Search, 
  Share, 
  ShieldCheck,
  Copy, 
  Video, 
  MoreVertical, 
  Phone, 
  Info,
  ArrowLeft,
  Sparkles,
  CheckCheck,
  Lock,
  LogIn,
  Smile
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDate, cn } from '../lib/utils';

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMessageId = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('support') === 'true' && !targetUser) {
      const fetchAdmin = async () => {
        try {
          // 1. Check direct auth for robustness as requested
          const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
          if (authError || !authUser) {
            console.error("[Support] Auth required:", authError);
            toast.error("Você precisa estar logado para acessar o suporte.");
            return;
          }

          // 2. Ensure a ticket exists in suporte_tickets (Requirement 2 & 6)
          const { data: existingTicket, error: ticketError } = await supabase
            .from('suporte_tickets')
            .select('*')
            .eq('usuario_id', authUser.id)
            .eq('status', 'aberto')
            .limit(1)
            .single();
          
          if (ticketError && ticketError.code !== 'PGRST116') {
            console.error("[Support] Error checking tickets:", ticketError);
          }

          if (!existingTicket) {
            console.log("[Support] Creating new ticket for chat session...");
            const { error: insertError } = await supabase
              .from('suporte_tickets')
              .insert({
                usuario_id: authUser.id,
                categoria: 'tecnico',
                assunto: 'Atendimento via Chat',
                descricao: 'Iniciado via botão de suporte no chat.',
                status: 'aberto'
              });
            
            if (insertError) {
              console.error("[Support] Error creating ticket:", insertError);
              // We continue anyway to try and find an admin
            }
          }

          // 3. Find admin to chat with
          let { data: adminData, error: adminError } = await supabase
            .from('perfis')
            .select('*')
            .eq('tipo_usuario', 'admin')
            .limit(1)
            .single();
          
          if (adminError || !adminData) {
            console.warn("[Support] Standard admin not found, trying fallback...", adminError);
            const { data: fallbackAdmin, error: fallbackError } = await supabase
              .from('perfis')
              .select('*')
              .eq('email', 'hogolezcano92@gmail.com')
              .limit(1)
              .single();
            
            if (fallbackError) {
               console.error("[Support] Fallback admin failed:", fallbackError);
               toast.error(`Erro ao conectar com suporte: ${fallbackError.message}`);
               return;
            }
            adminData = fallbackAdmin;
          }
          
          if (adminData) {
            setTargetUser(adminData);
          } else {
            console.error("[Support] No administrators available in the database.");
            toast.error("Nenhum administrador disponível no momento.");
          }
        } catch (err) {
          console.error("[Support] Fatal error in fetchAdmin:", err);
          toast.error("Falha ao iniciar chat de suporte.");
        }
      };
      fetchAdmin();
    }
  }, [location.search, targetUser]);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error("Erro ao tocar som:", e));
    }
  };

  useEffect(() => {
    let subscription: any;

    const fetchRecentChats = async () => {
      if (!user) return;
      const { data: msgs } = await supabase
        .from('mensagens')
        .select('*')
        .or(`remetente.eq.${user.id},destinatario.eq.${user.id}`)
        .order('criado_em', { ascending: false })
        .limit(100);

      if (msgs) {
        const uids = Array.from(new Set(msgs.flatMap(m => [m.remetente, m.destinatario]).filter(id => id !== user.id)));

        if (uids.length > 0) {
          const { data: chatUsers } = await supabase
            .from('perfis')
            .select('*')
            .in('id', uids);
          
          if (chatUsers) {
            setRecentChats(chatUsers);
          }
        }
      }
    };

    const init = async () => {
      // Prioritize session check as requested
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = user || session?.user;

      if (currentUser) {
        const { data: profile } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (profile) setUserData(profile);
        await fetchRecentChats();
        setLoading(false);

        subscription = supabase
          .channel('recent_chats_sidebar')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, (payload) => {
            console.log('[Realtime] Sidebar update event:', payload);
            fetchRecentChats();
          })
          .subscribe((status) => {
            console.log('[Realtime] Sidebar subscription status:', status);
          });
      } else if (!authLoading) {
        setLoading(false);
      }
    };

    if (!authLoading) {
      init();
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (user && targetUser) {
      setLoading(true);
      setTimeout(() => inputRef.current?.focus(), 500);
      
      let subscriptionSupabase: any;

      const fetchMessages = async () => {
        const { data: msgs } = await supabase
          .from('mensagens')
          .select('*')
          .or(`and(remetente.eq.${user.id},destinatario.eq.${targetUser.id}),and(remetente.eq.${targetUser.id},destinatario.eq.${user.id})`)
          .order('criado_em', { ascending: true });

        if (msgs) {
          if (lastMessageId.current && msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMessageId.current !== lastMsg.id && lastMsg.remetente !== user.id) {
              playSound();
            }
          }
          if (msgs.length > 0) {
            lastMessageId.current = msgs[msgs.length - 1].id;
          }
          setMessages(msgs);
        }
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        subscriptionSupabase = supabase
          .channel(`chat_${targetUser.id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'mensagens'
          }, (payload) => {
            console.log('[Realtime] New message received:', payload);
            const newMsg = payload.new;
            // Check if the message belongs to the current conversation
            const isRelevant = 
              (newMsg.remetente === user.id && newMsg.destinatario === targetUser.id) ||
              (newMsg.remetente === targetUser.id && newMsg.destinatario === user.id);
            
            if (isRelevant) {
              console.log('[Realtime] Message is relevant, fetching messages...');
              fetchMessages();
            }
          })
          .subscribe((status) => {
            console.log(`[Realtime] Chat subscription status for ${targetUser.id}:`, status);
          });
      };

      fetchMessages();

      return () => {
        if (subscriptionSupabase) supabase.removeChannel(subscriptionSupabase);
      };
    }
  }, [user, targetUser]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .or(`nome_completo.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%`);

      if (error) throw error;

      const isAdmin = userData?.tipo_usuario === 'admin' || userData?.email === 'hogolezcano92@gmail.com';
      const isPatient = userData?.tipo_usuario === 'paciente';
      const isPhysio = userData?.tipo_usuario === 'fisioterapeuta';

      const filteredResults = data.filter(u => {
        if (u.id === user.id) return false;
        if (isAdmin) return true;
        
        const targetIsPhysio = u.tipo_usuario === 'fisioterapeuta';
        const targetIsPatient = u.tipo_usuario === 'paciente';

        if (isPatient) return targetIsPhysio;
        if (isPhysio) return targetIsPatient;
        
        return false;
      });

      setSearchResults(filteredResults);
      if (filteredResults.length === 0) {
        const { toast } = await import('sonner');
        toast.error("Nenhum usuário encontrado com este nome ou e-mail.");
      }
    } catch (err) {
      console.error("Erro na busca:", err);
      const { toast } = await import('sonner');
      toast.error("Erro ao buscar usuários.");
    } finally {
      setSearching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !targetUser) return;

    try {
      const { toast } = await import('sonner');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat-files/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') // Using avatars bucket as it already exists
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Send the link as a message
      await supabase
        .from('mensagens')
        .insert({
          remetente: user.id,
          destinatario: targetUser.id,
          mensagem: `Arquivo enviado: ${file.name}\n${publicUrl}`,
          criado_em: new Date().toISOString(),
          lida: false
        });

      toast.success('Arquivo compartilhado!');
    } catch (error) {
      console.error('Error uploading file:', error);
      const { toast } = await import('sonner');
      toast.error('Erro ao compartilhar arquivo');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !targetUser || !user) return;

    const text = inputText;
    setInputText('');

    try {
      const { error } = await supabase
        .from('mensagens')
        .insert({
          remetente: user.id,
          destinatario: targetUser.id,
          mensagem: text,
          criado_em: new Date().toISOString(),
          lida: false
        });

      if (error) throw error;

      // Create notification for recipient
      await supabase
        .from('notificacoes')
        .insert({
          user_id: targetUser.id,
          titulo: 'Nova Mensagem',
          mensagem: `${userData?.nome_completo || 'Alguém'} enviou uma mensagem para você.`,
          tipo: 'message',
          lida: false,
          link: '/chat'
        });
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      const { toast } = await import('sonner');
      toast.error("Erro ao enviar mensagem.");
    }
  };

  const handleShareConversation = async () => {
    if (!messages.length || !targetUser || !user) return;
    const transcript = messages.map(m => {
      const sender = m.remetente === user.id ? 'Eu' : (targetUser.nome_completo);
      return `[${formatDate(m.criado_em)}] ${sender}: ${m.mensagem}`;
    }).join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: `Conversa com ${targetUser.nome_completo}`, text: transcript });
      } else {
        await navigator.clipboard.writeText(transcript);
        const { toast } = await import('sonner');
        toast.success("Transcrição copiada!");
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex bg-slate-950 rounded-none border-none shadow-none overflow-hidden relative pt-16 lg:pt-0">
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0">
        <img 
          src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070" 
          className="w-full h-full object-cover"
          alt="decoration"
          referrerPolicy="no-referrer"
        />
      </div>
      {/* ... rest of component ... */}
      {/* (I'll just replace the copy button inside the map) */}


      {/* Sidebar */}
      <aside className={cn(
        "w-full md:w-80 lg:w-96 border-r border-white/5 flex flex-col bg-slate-900/50 backdrop-blur-xl z-10 transition-all",
        targetUser && "hidden md:flex"
      )}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
              <MessageSquare className="text-blue-400" />
              Chats
            </h2>
            <button 
              onClick={async () => {
                try {
                  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
                  if (authError || !authUser) {
                    console.error("[Support] Auth fail:", authError);
                    toast.error("Sessão inválida. Por favor, faça login novamente.");
                    return;
                  }

                  // Ensure ticket exists (Requirement 2 & 6)
                  const { error: ticketError } = await supabase
                    .from('suporte_tickets')
                    .insert({
                      usuario_id: authUser.id,
                      categoria: 'tecnico',
                      assunto: 'Suporte via Chat',
                      descricao: 'Solicitado manualmente na barra lateral de chat.',
                      status: 'aberto'
                    });
                  
                  if (ticketError) console.error("[Support] Ticket creation error:", ticketError);

                  let { data: adminData, error: adminError } = await supabase
                    .from('perfis')
                    .select('*')
                    .eq('tipo_usuario', 'admin')
                    .limit(1)
                    .single();
                  
                  if (!adminData) {
                    console.warn("[Support] Main admin search failed:", adminError);
                    const { data: fallbackAdmin, error: fallbackError } = await supabase
                      .from('perfis')
                      .select('*')
                      .eq('email', 'hogolezcano92@gmail.com')
                      .limit(1)
                      .single();
                    adminData = fallbackAdmin;
                    if (fallbackError) console.error("[Support] Fallback admin search failed:", fallbackError);
                  }
                  
                  if (adminData) {
                    setTargetUser(adminData);
                  } else {
                    console.error("[Support] No admins found in perfis table.");
                    toast.error(`Suporte indisponível: ${adminError?.message || 'Administradores não encontrados'}`);
                  }
                } catch (err) {
                  console.error("[Support] Unexpected error:", err);
                  toast.error("Erro interno ao abrir suporte.");
                }
              }}
              className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all flex items-center gap-2 border border-blue-500/20"
            >
              <ShieldCheck size={14} />
              Suporte
            </button>
          </div>

          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors pointer-events-none" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full !pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all shadow-sm text-white font-bold"
            />
            {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-400" size={18} />}
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Resultados da Busca</h3>
              {searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setTargetUser(u); setSearchResults([]); setSearchQuery(''); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all group"
                >
                  <div className="relative">
                    <img 
                      src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} 
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" 
                      alt={u.nome_completo} 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{u.nome_completo}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Conversas Recentes</h3>
          {recentChats.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-300 shadow-sm">
                <Search size={24} />
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Nenhuma conversa ainda.<br/>Busque por um profissional ou paciente acima.
              </p>
            </div>
          ) : (
            recentChats.map(u => (
              <button
                key={u.id}
                onClick={() => setTargetUser(u)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group",
                  targetUser?.id === u.id ? "bg-white shadow-lg ring-1 ring-slate-100" : "hover:bg-white/50"
                )}
              >
                <div className="relative">
                  <img 
                    src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} 
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" 
                    alt={u.nome_completo || u.nome} 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className={cn("font-bold transition-colors", targetUser?.id === u.id ? "text-blue-600" : "text-slate-900")}>{u.nome_completo}</p>
                    <span className="text-[10px] text-slate-400 font-bold">12:45</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate font-medium">Clique para ver as mensagens</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <main className={cn(
        "flex-1 flex flex-col bg-slate-950 z-10",
        !targetUser && "hidden md:flex items-center justify-center bg-slate-900/20"
      )}>
        {!targetUser ? (
          <div className="text-center space-y-6 max-w-sm p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-900/40 animate-bounce">
              <MessageSquare size={48} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Sua Central de Mensagens</h2>
              <p className="text-slate-400 font-medium leading-relaxed">
                Conecte-se instantaneamente com seu {userData?.tipo_usuario === 'paciente' ? 'fisioterapeuta' : 'paciente'} para um acompanhamento mais próximo.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-sm">
                <Video className="text-blue-400 mb-2 mx-auto" size={20} />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vídeo Chamadas</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-sm">
                <Share className="text-emerald-400 mb-2 mx-auto" size={20} />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Compartilhamento</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="px-3 py-2 md:p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl sticky top-0 z-20 h-[60px] md:h-auto">
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <button onClick={() => setTargetUser(null)} className="md:hidden p-1.5 text-slate-400 hover:text-blue-400 transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div className="relative flex-shrink-0">
                  <img 
                    src={targetUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.id}`} 
                    className="w-8 h-8 md:w-14 md:h-14 rounded-2xl object-cover border-2 border-white/10 shadow-md" 
                    alt={targetUser.nome_completo} 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-5 md:h-5 bg-emerald-500 border-2 md:border-4 border-slate-900 rounded-full"></div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs md:text-lg font-black text-white truncate pr-2 leading-tight tracking-tight">{targetUser.nome_completo}</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[7px] md:text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] truncate">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 md:gap-2 flex-shrink-0">
                <button className="p-1.5 md:p-3 text-slate-400 hover:text-blue-400 hover:bg-white/5 rounded-xl md:rounded-2xl transition-all border border-transparent hover:border-white/5">
                  <Phone size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                <button 
                  onClick={() => navigate(`/telehealth?room=FisioCareHub-${[user?.id, targetUser.id].sort().join('-')}`)}
                  className="p-1.5 md:p-3 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl md:rounded-2xl transition-all shadow-sm border border-blue-500/20"
                >
                  <Video size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                <button 
                  onClick={handleShareConversation}
                  className="p-1.5 md:p-3 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl md:rounded-2xl transition-all shadow-sm border border-emerald-500/20"
                  title="Compartilhar conversa"
                >
                  <Share size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                <div className="hidden md:block w-px h-8 bg-white/10 mx-2"></div>
                <button 
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className={cn(
                    "p-1.5 md:p-3 rounded-xl md:rounded-2xl transition-all border",
                    showUserInfo ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/5"
                  )}
                >
                  <Info size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed scroll-smooth invert opacity-50">
                <div className="flex justify-center mb-8 invert">
                  <div className="px-4 py-1.5 bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] shadow-sm">
                    Início da Conversa Segura
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4 invert">
                    <Loader2 className="animate-spin text-blue-400" size={32} />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Carregando mensagens...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-20 space-y-4 invert">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20">
                      <Sparkles size={32} />
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Diga um "Olá" para começar!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.remetente === user?.id;
                    const msgDate = new Date(msg.criado_em);
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const prevMsgDate = prevMsg ? new Date(prevMsg.criado_em) : null;
                    
                    const showDateSeparator = !prevMsgDate || 
                      msgDate.toDateString() !== prevMsgDate.toDateString();

                    return (
                      <div key={msg.id} className="space-y-6 invert">
                        {showDateSeparator && (
                          <div className="flex justify-center my-8">
                            <div className="px-4 py-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                              {msgDate.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={cn("flex flex-col group", isMe ? "items-end" : "items-start")}
                        >
                          <div className={cn(
                            "max-w-[85%] md:max-w-[70%] px-4 py-2.5 md:px-6 md:py-4 rounded-[1.5rem] md:rounded-[2rem] text-sm shadow-xl relative transition-all min-w-[80px]",
                            isMe 
                              ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none shadow-blue-900/20" 
                              : "bg-white/5 text-white rounded-tl-none border border-white/10"
                          )}>
                            <p className="leading-relaxed font-bold mb-1 break-words">{msg.mensagem}</p>
                            
                            <div className={cn(
                              "text-[9px] font-black uppercase tracking-widest opacity-60 text-right",
                              isMe ? "text-blue-100" : "text-slate-500"
                            )}>
                              {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })
                )}
                <div ref={scrollRef} />
              </div>

              {/* User Info Panel (Admin/Support) */}
              <AnimatePresence>
                {showUserInfo && (
                  <motion.aside
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    className="fixed inset-y-0 right-0 w-full sm:w-80 lg:relative lg:inset-auto lg:w-96 border-l border-white/5 bg-slate-900 p-6 overflow-y-auto z-[40] lg:z-10 shadow-2xl lg:shadow-none"
                  >
                    <div className="flex justify-between items-center mb-6 lg:hidden">
                      <h3 className="text-lg font-black text-white tracking-tight">Detalhes do Usuário</h3>
                      <button onClick={() => setShowUserInfo(false)} className="p-2 text-slate-500 hover:text-white">
                        <ArrowLeft size={24} />
                      </button>
                    </div>

                    <div className="space-y-8">
                      <div className="text-center">
                        <div className="relative inline-block">
                          <img 
                            src={targetUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.id}`} 
                            className="w-32 h-32 rounded-[2.5rem] object-cover mx-auto border-4 border-white/10 shadow-2xl mb-4"
                            alt={targetUser.nome_completo}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-slate-900 rounded-2xl flex items-center justify-center text-white">
                            <CheckCheck size={16} />
                          </div>
                        </div>
                        <h4 className="text-2xl font-black text-white leading-tight tracking-tight">{targetUser.nome_completo}</h4>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mt-2">{targetUser.tipo_usuario}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl space-y-1 border border-white/5">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail</p>
                          <p className="text-sm font-bold text-slate-300 truncate">{targetUser.email}</p>
                        </div>
                        
                        {targetUser.telefone && (
                          <div className="p-4 bg-white/5 rounded-2xl space-y-1 border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Telefone</p>
                            <p className="text-sm font-bold text-slate-300">{targetUser.telefone}</p>
                          </div>
                        )}

                        {(userData?.tipo_usuario === 'admin' || userData?.email === 'hogolezcano92@gmail.com') && (
                          <>
                            <div className="p-4 bg-white/5 rounded-2xl space-y-1 border border-white/5">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID do Usuário</p>
                              <p className="text-[10px] font-mono text-slate-500 break-all">{targetUser.id}</p>
                            </div>
                            
                            {targetUser.localizacao && (
                              <div className="p-4 bg-white/5 rounded-2xl space-y-1 border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Localização</p>
                                <p className="text-sm font-bold text-slate-300">
                                  {targetUser.localizacao}
                                </p>
                              </div>
                            )}

                            {targetUser.especialidade && (
                              <div className="p-4 bg-white/5 rounded-2xl space-y-1 border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Especialidade</p>
                                <p className="text-sm font-bold text-slate-300">{targetUser.especialidade}</p>
                              </div>
                            )}
                            
                            {targetUser.crefito && (
                              <div className="p-4 bg-white/5 rounded-2xl space-y-1 border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CREFITO</p>
                                <p className="text-sm font-bold text-slate-300">{targetUser.crefito}</p>
                              </div>
                            )}

                            {targetUser.data_nascimento && (
                              <div className="p-4 bg-white/5 rounded-2xl space-y-1 border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data de Nascimento</p>
                                <p className="text-sm font-bold text-slate-300">{targetUser.data_nascimento}</p>
                              </div>
                            )}

                            {targetUser.genero && (
                              <div className="p-4 bg-white/5 rounded-2xl space-y-1 border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gênero</p>
                                <p className="text-sm font-bold text-slate-300 capitalize">{targetUser.genero}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <button 
                        onClick={() => navigate(`/profile/${targetUser.id}`)}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20"
                      >
                        <User size={18} />
                        Ver Perfil Completo
                      </button>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>

            {/* Footer / Input */}
            <footer className="p-2 md:p-6 bg-slate-950 border-t border-white/5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {(targetUser.tipo_usuario === 'admin' || targetUser.email === 'hogolezcano92@gmail.com') && !user ? (
                <div className="flex flex-col items-center gap-3 p-4 md:p-6 bg-blue-500/5 rounded-3xl border border-blue-500/20 mx-2 md:mx-0">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/40">
                    <Lock className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-black text-white text-xs md:text-base tracking-tight">Conectar ao Suporte</h4>
                    <p className="text-[10px] md:text-sm text-slate-500 mt-0.5 font-bold uppercase tracking-widest">Para sua segurança, autentique-se para falar com a administração.</p>
                  </div>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center gap-2"
                  >
                    <LogIn size={16} />
                    Entrar na Conta
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-4 items-center max-w-4xl mx-auto w-full">
                  <div className="flex-1 relative group">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as any);
                        }
                      }}
                      placeholder="Mensagem..."
                      className="w-full pl-5 pr-12 py-3 md:py-4 bg-white/5 border border-white/10 rounded-full outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-bold text-sm md:text-base shadow-inner text-white"
                    />
                    <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 md:gap-2">
                      <button type="button" className="p-1 md:p-2 text-slate-500 hover:text-blue-400 transition-colors">
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <input
                        type="file"
                        id="chat-file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <label 
                        htmlFor="chat-file-upload" 
                        className="p-1 md:p-2 text-slate-500 hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        <Share className="w-4 h-4 md:w-5 md:h-5" />
                      </label>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:scale-100 disabled:shadow-none flex-shrink-0"
                  >
                    <Send className="w-5 h-5 md:w-7 md:h-7 translate-x-0.5 -translate-y-0.5" />
                  </button>
                </form>
              )}
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
