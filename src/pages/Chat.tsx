import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
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
  getDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Loader2, MessageSquare, Search, Share, Copy } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';

export default function Chat() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) setUserData(snap.data());
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && targetUser) {
      const q = query(
        collection(db, 'chats'),
        where('senderId', 'in', [user.uid, targetUser.uid]),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const msgs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((m: any) => 
            (m.senderId === user.uid && m.receiverId === targetUser.uid) ||
            (m.senderId === targetUser.uid && m.receiverId === user.uid)
          );
        setMessages(msgs);
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });

      return () => unsubscribe();
    }
  }, [user, targetUser]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', searchEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setTargetUser({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        alert("Usuário não encontrado.");
      }
    } catch (err) {
      alert("Erro na busca.");
    } finally {
      setSearching(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !targetUser) return;

    // Restriction for physiotherapists on free plan
    if (userData?.role === 'physiotherapist' && (!userData?.subscription?.plan || userData?.subscription?.plan === 'free')) {
      alert("O chat em tempo real é um recurso exclusivo para assinantes Basic ou Premium. Faça o upgrade para se conectar com seus pacientes.");
      return;
    }

    const text = inputText;
    setInputText('');

    try {
      await addDoc(collection(db, 'chats'), {
        senderId: user?.uid,
        receiverId: targetUser.id,
        text,
        createdAt: new Date().toISOString(),
        read: false
      });
    } catch (err) {
      alert("Erro ao enviar mensagem.");
    }
  };

  const handleShareConversation = async () => {
    if (!messages.length || !targetUser) return;

    const transcript = messages.map(m => {
      const sender = m.senderId === user?.uid ? 'Eu' : targetUser.name;
      return `[${formatDate(m.createdAt)}] ${sender}: ${m.text}`;
    }).join('\n');

    const shareData = {
      title: `Conversa com ${targetUser.name} - FisioCareHub`,
      text: transcript,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(transcript);
        alert("Transcrição da conversa copiada para a área de transferência!");
      }
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
    }
  };

  const handleShareMessage = async (msg: any) => {
    const sender = msg.senderId === user?.uid ? 'Eu' : targetUser.name;
    const text = `[${formatDate(msg.createdAt)}] ${sender}: ${msg.text}`;

    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Mensagem copiada!");
      }
    } catch (err) {
      console.error("Erro ao compartilhar mensagem:", err);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
      {!targetUser ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <MessageSquare size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Mensagens</h2>
          <p className="text-slate-500 mb-8 max-w-xs">
            Busque pelo e-mail do seu {userData?.role === 'patient' ? 'fisioterapeuta' : 'paciente'} para iniciar uma conversa.
          </p>
          <form onSubmit={handleSearch} className="w-full max-w-sm flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 className="animate-spin" /> : 'Buscar'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Chat Header */}
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white">
            <div className="flex items-center gap-4">
              <img
                src={targetUser.photoURL}
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-50"
                alt={targetUser.name}
              />
              <div>
                <h3 className="font-bold text-slate-900">{targetUser.name}</h3>
                <span className="text-xs text-emerald-500 font-bold uppercase tracking-widest">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleShareConversation}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
                title="Compartilhar conversa"
              >
                <Share size={18} />
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
              <button
                onClick={() => setTargetUser(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                Trocar conversa
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  msg.senderId === user?.uid ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm shadow-sm relative group/msg",
                  msg.senderId === user?.uid 
                    ? "bg-blue-600 text-white rounded-tr-none" 
                    : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                )}>
                  {msg.text}
                  <button
                    onClick={() => handleShareMessage(msg)}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover/msg:opacity-100 transition-opacity bg-white/10 hover:bg-white/20",
                      msg.senderId === user?.uid ? "-left-10" : "-right-10 text-slate-400 hover:bg-slate-100"
                    )}
                    title="Copiar mensagem"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">
                  {formatDate(msg.createdAt)}
                </span>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-slate-50">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
              <button
                type="submit"
                className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <Send size={24} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
