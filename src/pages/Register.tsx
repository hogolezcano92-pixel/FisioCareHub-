import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, Stethoscope, Mail, Lock, UserCircle, Loader2, Eye, EyeOff, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import Logo from '../components/Logo';

// 1. IMPORTAÇÃO DO SERVIÇO DE IA
import { realizarTriagemIA } from '../services/ai/triagemService';

export default function Register() {
  const [role, setRole] = useState<'paciente' | 'fisioterapeuta'>(() => {
    const saved = localStorage.getItem('pending_role');
    return (saved === 'fisioterapeuta' || saved === 'paciente') ? saved : 'paciente';
  });

  const handleRoleChange = (newRole: 'paciente' | 'fisioterapeuta') => {
    setRole(newRole);
    localStorage.setItem('pending_role', newRole);
  };

  // Estados do Formulário
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [serviceType, setServiceType] = useState<'domicilio' | 'online' | 'ambos'>('ambos');
  const [crefito, setCrefito] = useState('');
  const [registrationDocs, setRegistrationDocs] = useState<File[]>([]);
  const [proKey, setProKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (cleanName.length < 2) {
      setError("O nome completo deve ter pelo menos 2 caracteres.");
      setLoading(false);
      return;
    }

    try {
      // 2. CHAMADA DA IA PARA VALIDAR O PAPEL (TRIAGEM)
      const roleFinalIA = await realizarTriagemIA(`Usuário ${cleanName} selecionou ${role}.`);
      const finalType = roleFinalIA as 'paciente' | 'fisioterapeuta';
      
      const isPro = finalType === 'fisioterapeuta' && proKey.trim().toUpperCase() === 'PRO2024';

      // 3. REGISTRO NO SUPABASE AUTH
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
            tipo_usuario: finalType,
            crefito: finalType === 'fisioterapeuta' ? crefito : null
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Upload de documentos para Fisioterapeutas
        const uploadedDocUrls: string[] = [];
        if (finalType === 'fisioterapeuta' && registrationDocs.length > 0) {
          const { uploadDocument } = await import('../services/supabaseStorage');
          for (const file of registrationDocs) {
            try {
              const url = await uploadDocument(authData.user.id, file);
              uploadedDocUrls.push(url);
            } catch (err) { console.error("Erro upload:", err); }
          }
        }

        // 4. CRIAÇÃO DO PERFIL DETALHADO (TABELA PERFIS)
        const profileData = {
          id: authData.user.id,
          email: cleanEmail,
          nome_completo: cleanName,
          tipo_usuario: finalType,
          tipo: finalType, // CORREÇÃO: Preenchendo a coluna 'tipo' solicitada
          genero: finalType === 'fisioterapeuta' ? (gender || null) : null,
          especialidade: finalType === 'fisioterapeuta' ? (specialty || null) : null,
          crefito: finalType === 'fisioterapeuta' ? (crefito || null) : null,
          localizacao: city || null,
          endereco: address || null,
          cep: zipCode || null,
          pais: country || null,
          tipo_servico: finalType === 'fisioterapeuta' ? (serviceType || null) : null,
          is_pro: isPro,
          aprovado: finalType === 'paciente',
          status_aprovacao: finalType === 'paciente' ? 'aprovado' : 'pendente',
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanName.replace(/\s+/g, '_')}`,
          documentos: uploadedDocUrls,
          created_at: new Date().toISOString()
        };

        const { error: profileError } = await supabase.from('perfis').upsert(profileData);
        if (profileError) throw profileError;

        const { toast } = await import('sonner');
        toast.success('Cadastro realizado com sucesso!', {
          description: 'Sua conta foi configurada. Faça login para continuar.'
        });
        navigate('/login');
      }
    } catch (err: any) {
      console.error("Erro inesperado:", err);
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-10 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6"><Logo size="lg" /></div>
          <h2 className="text-3xl font-bold text-slate-900">Criar Conta</h2>
          <p className="text-base text-slate-500 mt-2">FisioCareHub: Conectando saúde e bem-estar.</p>
        </div>

        {/* Seleção de Tipo de Usuário */}
        <div className="mb-8">
          <label className="block text-base font-semibold text-slate-700 mb-2">Você é:</label>
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as any)}
            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base transition-all"
          >
            <option value="paciente">Paciente (Busco atendimento)</option>
            <option value="fisioterapeuta">Fisioterapeuta (Quero atender)</option>
          </select>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Campos para Fisioterapeuta */}
          {role === 'fisioterapeuta' && (
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Pronome de Tratamento</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setGender('male')} className={cn("flex-1 py-3 rounded-2xl text-sm font-bold border transition-all", gender === 'male' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600")}>Dr.</button>
                <button type="button" onClick={() => setGender('female')} className={cn("flex-1 py-3 rounded-2xl text-sm font-bold border transition-all", gender === 'female' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600")}>Dra.</button>
              </div>
            </div>
          )}

          {/* Nome e Localização */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
              <div className="relative">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base" placeholder="Seu nome" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">CEP</label>
                <input type="text" required value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base" placeholder="00000-000" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cidade</label>
                <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base" placeholder="Cidade" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Endereço</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base" placeholder="Rua, número, bairro" />
              </div>
            </div>
          </div>

          {/* Dados Profissionais */}
          {role === 'fisioterapeuta' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" required placeholder="CREFITO" value={crefito} onChange={(e) => setCrefito(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base" />
                <input type="text" required placeholder="Especialidade" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base" />
              </div>
              <input type="text" placeholder="CHAVE PRO (OPCIONAL)" value={proKey} onChange={(e) => setProKey(e.target.value.toUpperCase())} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base font-mono tracking-widest" />
            </motion.div>
          )}

          {/* E-mail e Senha */}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base" placeholder="seu@email.com" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base" placeholder="Senha" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 p-4 rounded-2xl font-medium">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center mt-8 text-base text-slate-500">
          Já tem uma conta? <Link to="/login" className="text-blue-600 font-bold hover:underline transition-all">Entrar</Link>
        </p>
      </motion.div>
    </div>
  );
}
