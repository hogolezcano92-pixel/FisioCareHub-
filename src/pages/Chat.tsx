import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  getDocs,
  limit,
  doc,
  getDoc,
  serverTimestamp,
  or,
  and
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
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
  CheckCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, cn } from '../lib/utils';

export default function Chat() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
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
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error("Erro ao tocar som:", e));
    }
  };

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) setUserData(snap.data());
      });

      // Fetch recent chats
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, async (snap) => {
        const uids = new Set<string>();
        snap.docs.forEach(d => {
          const data = d.data();
          data.participants?.forEach((pid: string) => {
            if (pid !== user.uid) uids.add(pid);
          });
        });

        const chatUsers = await Promise.all(
          Array.from(uids).map(async (uid) => {
            const uSnap = await getDoc(doc(db, 'users', uid));
            return uSnap.exists() ? { id: uSnap.id, ...uSnap.data() } : null;
          })
        );
        setRecentChats(chatUsers.filter(u => u !== null));
      });

      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user && targetUser) {
      setLoading(true);
      // Focus input when target user changes
      setTimeout(() => inputRef.current?.focus(), 500);
      
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const msgs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((m: any) => 
            m.participants?.includes(targetUser.id)
          );
        
        if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1] as any;
          if (lastMessageId.current && lastMessageId.current !== lastMsg.id && lastMsg.senderId !== user.uid) {
            playSound();
          }
          lastMessageId.current = lastMsg.id;
        }

        setMessages(msgs);
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'chats');
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, targetUser]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      // Search by email or name (exact or prefix if possible)
      const qEmail = query(collection(db, 'users'), where('email', '==', searchQuery.trim().toLowerCase()));
      const qName = query(collection(db, 'users'), where('name', '>=', searchQuery.trim()), where('name', '<=', searchQuery.trim() + '\uf8ff'));
      
      const [snapEmail, snapName] = await Promise.all([getDocs(qEmail), getDocs(qName)]);
      
      const results = new Map();
      snapEmail.docs.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
      snapName.docs.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
      
      // Filter out self and only opposite roles (physio <-> patient) unless admin
      const filteredResults = Array.from(results.values()).filter(u => 
        u.id !== user?.uid && 
        (userData?.role === 'admin' || (userData?.role === 'patient' ? u.role === 'physiotherapist' : u.role === 'patient'))
      );

      setSearchResults(filteredResults);
      if (filteredResults.length === 0) {
        import('sonner').then(({ toast }) => toast.error("Nenhum usuário encontrado com este nome ou e-mail."));
      }
    } catch (err) {
      console.error("Erro na busca:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao buscar usuários."));
    } finally {
      setSearching(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !targetUser || !user) return;

    if (userData?.role === 'physiotherapist' && (!userData?.subscription?.plan || userData?.subscription?.plan === 'free')) {
      import('sonner').then(({ toast }) => toast.error("O chat em tempo real é um recurso exclusivo para assinantes Basic ou Premium."));
      return;
    }

    const text = inputText;
    setInputText('');

    try {
      await addDoc(collection(db, 'chats'), {
        senderId: user.uid,
        receiverId: targetUser.id,
        participants: [user.uid, targetUser.id],
        text,
        createdAt: serverTimestamp(),
        read: false,
        type: targetUser.role === 'admin' ? 'support' : 'chat'
      });

      // Create notification for receiver
      await addDoc(collection(db, 'notifications'), {
        userId: targetUser.id,
        title: `Nova mensagem de ${userData?.name || 'Usuário'}`,
        message: text.length > 60 ? text.substring(0, 60) + '...' : text,
        type: 'message',
        read: false,
        createdAt: serverTimestamp(),
        link: '/chat'
      });
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao enviar mensagem."));
    }
  };

  const handleShareConversation = async () => {
    if (!messages.length || !targetUser) return;
    const transcript = messages.map(m => {
      const sender = m.senderId === user?.uid ? 'Eu' : targetUser.name;
      return `[${formatDate(m.createdAt)}] ${sender}: ${m.text}`;
    }).join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: `Conversa com ${targetUser.name}`, text: transcript });
      } else {
        await navigator.clipboard.writeText(transcript);
        import('sonner').then(({ toast }) => toast.success("Transcrição copiada!"));
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
                const q = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                  const admin = { id: snap.docs[0].id, ...snap.docs[0].data() };
                  setTargetUser(admin);
                } else {
                  import('sonner').then(({ toast }) => toast.error("Suporte indisponível no momento."));
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
                    <img src={u.photoURL} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" alt={u.name} />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{u.name}</p>
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
                  <img src={u.photoURL} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" alt={u.name} />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className={cn("font-bold transition-colors", targetUser?.id === u.id ? "text-blue-600" : "text-slate-900")}>{u.name}</p>
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
                Conecte-se instantaneamente com seu {userData?.role === 'patient' ? 'fisioterapeuta' : 'paciente'} para um acompanhamento mais próximo.
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
            <header className="p-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <button onClick={() => setTargetUser(null)} className="md:hidden p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  <ArrowLeft size={24} />
                </button>
                <div className="relative">
                  <img src={targetUser.photoURL} className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-50 shadow-md" alt={targetUser.name} />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{targetUser.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Disponível agora</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
                  <Phone size={20} />
                </button>
                <button 
                  onClick={() => navigate(`/telehealth?room=FisioCareHub-${[user?.uid, targetUser.id].sort().join('-')}`)}
                  className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all shadow-sm"
                >
                  <Video size={20} />
                </button>
                <div className="w-px h-8 bg-slate-100 mx-2"></div>
                <button onClick={handleShareConversation} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all">
                  <Share size={20} />
                </button>
                <button 
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className={cn(
                    "p-3 rounded-2xl transition-all",
                    showUserInfo ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Info size={20} />
                </button>
                <button className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">
                  <MoreVertical size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 scroll-smooth">
                <div className="flex justify-center mb-8">
                  <div className="px-4 py-1.5 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
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
                    const isMe = msg.senderId === user?.uid;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={cn("flex flex-col group", isMe ? "items-end" : "items-start")}
                      >
                        <div className={cn(
                          "max-w-[75%] px-6 py-4 rounded-[2rem] text-sm shadow-sm relative transition-all",
                          isMe 
                            ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none shadow-blue-100" 
                            : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                        )}>
                          <p className="leading-relaxed font-medium">{msg.text}</p>
                          <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                            isMe ? "-left-14" : "-right-14"
                          )}>
                            <button 
                              onClick={() => { 
                                navigator.clipboard.writeText(msg.text); 
                                import('sonner').then(({ toast }) => toast.success("Copiado!"));
                              }} 
                              className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                        <div className={cn("flex items-center gap-2 mt-2 px-2", isMe ? "flex-row-reverse" : "flex-row")}>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            {formatDate(msg.createdAt)}
                          </span>
                          {isMe && <CheckCheck size={14} className="text-blue-500" />}
                        </div>
                      </motion.div>
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
                            src={targetUser.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'} 
                            className="w-32 h-32 rounded-[2.5rem] object-cover mx-auto border-4 border-blue-50 shadow-2xl mb-4"
                            alt={targetUser.name}
                          />
                          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-white rounded-2xl flex items-center justify-center text-white">
                            <CheckCheck size={16} />
                          </div>
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 leading-tight">{targetUser.name}</h4>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">{targetUser.role}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                          <p className="text-sm font-bold text-slate-700 truncate">{targetUser.email}</p>
                        </div>
                        
                        {targetUser.phone && (
                          <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</p>
                            <p className="text-sm font-bold text-slate-700">{targetUser.phone}</p>
                          </div>
                        )}

                        {userData?.role === 'admin' && (
                          <>
                            <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID do Usuário</p>
                              <p className="text-[10px] font-mono text-slate-500 break-all">{targetUser.id}</p>
                            </div>
                            
                            {(targetUser.city || targetUser.state) && (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</p>
                                <p className="text-sm font-bold text-slate-700">
                                  {targetUser.city}{targetUser.city && targetUser.state ? ', ' : ''}{targetUser.state}
                                </p>
                              </div>
                            )}

                            {targetUser.specialty && (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidade</p>
                                <p className="text-sm font-bold text-slate-700">{targetUser.specialty}</p>
                              </div>
                            )}
                            
                            {targetUser.crefito && (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CREFITO</p>
                                <p className="text-sm font-bold text-slate-700">{targetUser.crefito}</p>
                              </div>
                            )}

                            {targetUser.birthDate && (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Nascimento</p>
                                <p className="text-sm font-bold text-slate-700">{targetUser.birthDate}</p>
                              </div>
                            )}

                            {targetUser.gender && (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gênero</p>
                                <p className="text-sm font-bold text-slate-700 capitalize">{targetUser.gender}</p>
                              </div>
                            )}

                            {targetUser.subscription && (
                              <div className="p-4 bg-blue-50 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Plano de Assinatura</p>
                                <div className="flex items-center gap-2">
                                  <Sparkles size={14} className="text-blue-600" />
                                  <p className="text-sm font-bold text-blue-700 uppercase">{targetUser.subscription.plan || 'Free'}</p>
                                </div>
                              </div>
                            )}
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
            <footer className="p-6 bg-white border-t border-slate-50">
              <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
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
                    placeholder="Escreva sua mensagem aqui..."
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white transition-all font-medium"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button type="button" className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                      <Sparkles size={20} />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                >
                  <Send size={28} />
                </button>
              </form>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
