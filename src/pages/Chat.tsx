import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  collection, 
  query as firestoreQuery, 
  where as firestoreWhere, 
  onSnapshot as firestoreOnSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy as firestoreOrderBy 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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
  const [firebaseUser] = useAuthState(auth);
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
        let { data: adminData } = await supabase
          .from('perfis')
          .select('*')
          .eq('tipo_usuario', 'admin')
          .limit(1)
          .single();
        
        if (!adminData) {
          const { data: fallbackAdmin } = await supabase
            .from('perfis')
            .select('*')
            .in('email', ['hugo_lezcano92@hotmail.com', 'hogolezcano92@gmail.com', 'lezcanohugo662@gmail.com'])
            .limit(1)
            .single();
          adminData = fallbackAdmin;
        }
        
        if (adminData) {
          // Force role to admin for chat logic if it's one of the known admin emails
          const adminEmails = ['hugo_lezcano92@hotmail.com', 'hogolezcano92@gmail.com', 'lezcanohugo662@gmail.com'];
          if (adminEmails.includes(adminData.email)) {
            adminData.tipo_usuario = 'admin';
          }
          setTargetUser(adminData);
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
        .or(`remetente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
        .order('data_envio', { ascending: false })
        .limit(100);

      if (msgs) {
        const uids = Array.from(new Set(msgs.flatMap(m => [m.remetente_id, m.destinatario_id]).filter(id => id !== user.id)));

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
      if (user) {
        const { data: profile } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) setUserData(profile);
        await fetchRecentChats();
        setLoading(false);

        subscription = supabase
          .channel('recent_chats_sidebar')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, () => {
            fetchRecentChats();
          })
          .subscribe();
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
      
      let unsubscribeFirestore: any;
      let subscriptionSupabase: any;

      const fetchMessages = async () => {
        if (targetUser.tipo_usuario === 'admin') {
          if (!firebaseUser) {
            setLoading(false);
            return;
          }

          const q = firestoreQuery(
            collection(db, 'chats'),
            firestoreWhere('participants', 'array-contains', firebaseUser.uid),
            firestoreOrderBy('createdAt', 'asc')
          );

          unsubscribeFirestore = firestoreOnSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
              id: doc.id,
              remetente_id: doc.data().senderId === firebaseUser.uid ? user.id : targetUser.id,
              conteudo: doc.data().text,
              data_envio: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString()
            }));

            if (lastMessageId.current && msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1];
              if (lastMessageId.current !== lastMsg.id && lastMsg.remetente_id !== user.id) {
                playSound();
              }
            }
            if (msgs.length > 0) {
              lastMessageId.current = msgs[msgs.length - 1].id;
            }
            setMessages(msgs);
            setLoading(false);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          });
        } else {
          const { data: msgs } = await supabase
            .from('mensagens')
            .select('*')
            .or(`and(remetente_id.eq.${user.id},destinatario_id.eq.${targetUser.id}),and(remetente_id.eq.${targetUser.id},destinatario_id.eq.${user.id})`)
            .order('data_envio', { ascending: true });

          if (msgs) {
            if (lastMessageId.current && msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1];
              if (lastMessageId.current !== lastMsg.id && lastMsg.remetente_id !== user.id) {
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
              event: '*', 
              schema: 'public', 
              table: 'mensagens',
              filter: `or(and(remetente_id.eq.${user.id},destinatario_id.eq.${targetUser.id}),and(remetente_id.eq.${targetUser.id},destinatario_id.eq.${user.id}))`
            }, () => {
              fetchMessages();
            })
            .subscribe();
        }
      };

      fetchMessages();

      return () => {
        if (unsubscribeFirestore) unsubscribeFirestore();
        if (subscriptionSupabase) supabase.removeChannel(subscriptionSupabase);
      };
    }
  }, [user, targetUser, firebaseUser]);

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

      const filteredResults = data.filter(u => 
        u.id !== user.id && 
        (userData?.tipo_usuario === 'admin' || (userData?.tipo_usuario === 'paciente' ? u.tipo_usuario === 'fisioterapeuta' : u.tipo_usuario === 'paciente'))
      );

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !targetUser || !user) return;

    const text = inputText;
    setInputText('');

    try {
      if (targetUser.tipo_usuario === 'admin') {
        if (!firebaseUser) {
          const { toast } = await import('sonner');
          toast.error("Você precisa estar conectado ao banco de dados para falar com o suporte.");
          return;
        }

        await addDoc(collection(db, 'chats'), {
          senderId: firebaseUser.uid,
          receiverId: targetUser.id, // Admin Supabase ID
          participants: [firebaseUser.uid, targetUser.id],
          text: text,
          createdAt: serverTimestamp(),
          read: false,
          type: 'support',
          patientSupabaseId: user.id,
          patientFirebaseUid: firebaseUser.uid
        });
      } else {
        const { error } = await supabase
          .from('mensagens')
          .insert({
            remetente_id: user.id,
            destinatario_id: targetUser.id,
            conteudo: text,
            data_envio: new Date().toISOString(),
            lida: false
          });

        if (error) throw error;
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      const { toast } = await import('sonner');
      toast.error("Erro ao enviar mensagem.");
    }
  };

  const handleShareConversation = async () => {
    if (!messages.length || !targetUser || !user) return;
    const transcript = messages.map(m => {
      const sender = m.remetente_id === user.id ? 'Eu' : targetUser.nome_completo;
      return `[${formatDate(m.data_envio)}] ${sender}: ${m.conteudo}`;
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
    <div className="h-[calc(100vh-4rem)] flex bg-white rounded-none border-none shadow-none overflow-hidden relative">
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
        "w-full md:w-80 lg:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50 backdrop-blur-sm z-10 transition-all",
        targetUser && "hidden md:flex"
      )}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="text-blue-600" />
              Chats
            </h2>
            <button 
              onClick={async () => {
                let { data: adminData } = await supabase
                  .from('perfis')
                  .select('*')
                  .eq('tipo_usuario', 'admin')
                  .limit(1)
                  .single();
                
                if (!adminData) {
                  const { data: fallbackAdmin } = await supabase
                    .from('perfis')
                    .select('*')
                    .in('email', ['hugo_lezcano92@hotmail.com', 'hogolezcano92@gmail.com', 'lezcanohugo662@gmail.com'])
                    .limit(1)
                    .single();
                  adminData = fallbackAdmin;
                }
                
                if (adminData) {
                  // Force role to admin for chat logic if it's one of the known admin emails
                  const adminEmails = ['hugo_lezcano92@hotmail.com', 'hogolezcano92@gmail.com', 'lezcanohugo662@gmail.com'];
                  if (adminEmails.includes(adminData.email)) {
                    adminData.tipo_usuario = 'admin';
                  }
                  setTargetUser(adminData);
                } else {
                  const { toast } = await import('sonner');
                  toast.error("Suporte indisponível no momento.");
                }
              }}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2"
            >
              <ShieldCheck size={14} />
              Suporte
            </button>
          </div>

          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all shadow-sm"
            />
            {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-600" size={18} />}
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
                    alt={u.nome_completo} 
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
        "flex-1 flex flex-col bg-white z-10",
        !targetUser && "hidden md:flex items-center justify-center bg-slate-50/30"
      )}>
        {!targetUser ? (
          <div className="text-center space-y-6 max-w-sm p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-200 animate-bounce">
              <MessageSquare size={48} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-3">Sua Central de Mensagens</h2>
              <p className="text-slate-500 font-medium leading-relaxed">
                Conecte-se instantaneamente com seu {userData?.tipo_usuario === 'paciente' ? 'fisioterapeuta' : 'paciente'} para um acompanhamento mais próximo.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Video className="text-blue-600 mb-2 mx-auto" size={20} />
                <p className="text-[10px] font-black uppercase text-slate-400">Vídeo Chamadas</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Share className="text-emerald-600 mb-2 mx-auto" size={20} />
                <p className="text-[10px] font-black uppercase text-slate-400">Compartilhamento</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="px-3 py-2 md:p-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20 h-[60px] md:h-auto">
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <button onClick={() => setTargetUser(null)} className="md:hidden p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div className="relative flex-shrink-0">
                  <img 
                    src={targetUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.id}`} 
                    className="w-8 h-8 md:w-14 md:h-14 rounded-2xl object-cover border-2 border-blue-50 shadow-md" 
                    alt={targetUser.nome_completo} 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-5 md:h-5 bg-emerald-500 border-2 md:border-4 border-white rounded-full"></div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs md:text-lg font-black text-slate-900 truncate pr-2 leading-tight">{targetUser.nome_completo}</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[7px] md:text-[10px] text-emerald-500 font-black uppercase tracking-widest truncate">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 md:gap-2 flex-shrink-0">
                <button className="p-1.5 md:p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl md:rounded-2xl transition-all">
                  <Phone size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                <button 
                  onClick={() => navigate(`/telehealth?room=FisioCareHub-${[user?.id, targetUser.id].sort().join('-')}`)}
                  className="p-1.5 md:p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl md:rounded-2xl transition-all shadow-sm"
                >
                  <Video size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                <div className="hidden md:block w-px h-8 bg-slate-100 mx-2"></div>
                <button 
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className={cn(
                    "p-1.5 md:p-3 rounded-xl md:rounded-2xl transition-all",
                    showUserInfo ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Info size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed scroll-smooth">
                <div className="flex justify-center mb-8">
                  <div className="px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                    Início da Conversa Segura
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando mensagens...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                      <Sparkles size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">Diga um "Olá" para começar!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.remetente_id === user?.id;
                    const msgDate = new Date(msg.data_envio);
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const prevMsgDate = prevMsg ? new Date(prevMsg.data_envio) : null;
                    
                    const showDateSeparator = !prevMsgDate || 
                      msgDate.toDateString() !== prevMsgDate.toDateString();

                    return (
                      <div key={msg.id} className="space-y-6">
                        {showDateSeparator && (
                          <div className="flex justify-center my-8">
                            <div className="px-4 py-1 bg-slate-100/50 backdrop-blur-sm border border-slate-200/50 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">
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
                            "max-w-[85%] md:max-w-[70%] px-4 py-2.5 md:px-6 md:py-4 rounded-[1.5rem] md:rounded-[2rem] text-sm shadow-sm relative transition-all min-w-[80px]",
                            isMe 
                              ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none shadow-blue-100" 
                              : "bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200"
                          )}>
                            <p className="leading-relaxed font-medium mb-1 break-words">{msg.conteudo}</p>
                            
                            <div className={cn(
                              "text-[9px] font-medium opacity-60 text-right",
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
                    className="fixed inset-y-0 right-0 w-full sm:w-80 lg:relative lg:inset-auto lg:w-96 border-l border-slate-100 bg-white p-6 overflow-y-auto z-[60] lg:z-10 shadow-2xl lg:shadow-none"
                  >
                    <div className="flex justify-between items-center mb-6 lg:hidden">
                      <h3 className="text-lg font-black text-slate-900">Detalhes do Usuário</h3>
                      <button onClick={() => setShowUserInfo(false)} className="p-2 text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={24} />
                      </button>
                    </div>

                    <div className="space-y-8">
                      <div className="text-center">
                        <div className="relative inline-block">
                          <img 
                            src={targetUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.id}`} 
                            className="w-32 h-32 rounded-[2.5rem] object-cover mx-auto border-4 border-blue-50 shadow-2xl mb-4"
                            alt={targetUser.nome_completo}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-white rounded-2xl flex items-center justify-center text-white">
                            <CheckCheck size={16} />
                          </div>
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 leading-tight">{targetUser.nome_completo}</h4>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">{targetUser.tipo_usuario}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                          <p className="text-sm font-bold text-slate-700 truncate">{targetUser.email}</p>
                        </div>
                        
                        {targetUser.telefone && (
                          <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</p>
                            <p className="text-sm font-bold text-slate-700">{targetUser.telefone}</p>
                          </div>
                        )}

                        {userData?.tipo_usuario === 'admin' && (
                          <>
                            <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID do Usuário</p>
                              <p className="text-[10px] font-mono text-slate-500 break-all">{targetUser.id}</p>
                            </div>
                            
                            {targetUser.localizacao && (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</p>
                                <p className="text-sm font-bold text-slate-700">
                                  {targetUser.localizacao}
                                </p>
                              </div>
                            )}

                            {targetUser.especialidade && (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidade</p>
                                <p className="text-sm font-bold text-slate-700">{targetUser.especialidade}</p>
                              </div>
                            )}
                            
                            {targetUser.crefito && (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CREFITO</p>
                                <p className="text-sm font-bold text-slate-700">{targetUser.crefito}</p>
                              </div>
                            )}

                            {targetUser.data_nascimento && (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Nascimento</p>
                                <p className="text-sm font-bold text-slate-700">{targetUser.data_nascimento}</p>
                              </div>
                            )}

                            {targetUser.genero && (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gênero</p>
                                <p className="text-sm font-bold text-slate-700 capitalize">{targetUser.genero}</p>
                              </div>
                            )}

                            {/* Subscription plan display removed */}
                          </>
                        )}
                      </div>

                      <button 
                        onClick={() => navigate(`/profile/${targetUser.id}`)}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
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
            <footer className="p-2 md:p-6 bg-white border-t border-slate-50 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {targetUser.tipo_usuario === 'admin' && !firebaseUser ? (
                <div className="flex flex-col items-center gap-3 p-4 md:p-6 bg-blue-50 rounded-3xl border border-blue-100 mx-2 md:mx-0">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Lock className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-slate-900 text-xs md:text-base">Conectar ao Suporte</h4>
                    <p className="text-[10px] md:text-sm text-slate-600 mt-0.5">Para sua segurança, autentique-se para falar com a administração.</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const provider = new GoogleAuthProvider();
                        await signInWithPopup(auth, provider);
                      } catch (err) {
                        console.error("Erro no login Firebase:", err);
                        const { toast } = await import('sonner');
                        toast.error("Erro ao conectar ao suporte.");
                      }
                    }}
                    className="px-5 md:px-8 py-2 md:py-3 bg-blue-600 text-white rounded-xl md:rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 text-sm md:text-base"
                  >
                    <LogIn className="w-3.5 h-3.5 md:w-5 md:h-5" />
                    Autenticar com Google
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
                      className="w-full pl-5 pr-12 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white transition-all font-medium text-sm md:text-base shadow-inner"
                    />
                    <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 md:gap-2">
                      <button type="button" className="p-1 md:p-2 text-slate-400 hover:text-blue-600 transition-colors">
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:scale-100 disabled:shadow-none flex-shrink-0"
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
