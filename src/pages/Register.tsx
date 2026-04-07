import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, Stethoscope, Mail, Lock, UserCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import Logo from '../components/Logo';
import { realizarTriagemIA } from '../services/ai/triagemService';
export default function Register() {
  const [role, setRole] = useState<'paciente' | 'fisioterapeuta'>(() => {
    const saved = localStorage.getItem('pending_role');
    return (saved === 'fisioterapeuta' || saved === 'paciente') ? saved : 'paciente';
  });

  const handleRoleChange = (newRole: 'paciente' | 'fisioterapeuta') => {
    console.log("Setting role to:", newRole);
    setRole(newRole);
    localStorage.setItem('pending_role', newRole);
  };
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      console.error("Erro no cadastro com Google:", err);
      setError('Erro ao entrar com Google: ' + err.message);
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Validação e Limpeza de Dados (Ponto CRÍTICO)
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const isPro = role === 'fisioterapeuta' && proKey.trim().toUpperCase() === 'PRO2024';

    if (cleanName.length < 2) {
      setError("O nome completo deve ter pelo menos 2 caracteres.");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Por favor, insira um e-mail válido.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }
    const roleFinalIA = await realizarTriagemIA(`Usuário ${cleanName} selecionou ${role}.`);
    const finalType = roleFinalIA as 'paciente' | 'fisioterapeuta';

    try {
      console.log("Starting registration for:", cleanEmail, "Role:", finalType);


    try {
      console.log("Starting registration for:", cleanEmail, "Role:", role);
      // 2. Criar o usuário no Supabase Auth com metadados iniciais
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
            tipo_usuario: finalType,
            crefito: finalType === 'fisioterapeuta' ? crefito : null,
            especialidade: finalType === 'fisioterapeuta' ? specialty : null
          }
        }
      });

      if (authError) {
        console.error("Auth signUp error:", authError);
        setError('Erro no cadastro: ' + authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        console.log("User created in Auth:", authData.user.id);
        // 3. Upload documents if any (for physios)
        const uploadedDocUrls: string[] = [];
        if (role === 'fisioterapeuta' && registrationDocs.length > 0) {
          console.log("Uploading documents...");
          const { uploadDocument } = await import('../services/supabaseStorage');
          for (const file of registrationDocs) {
            try {
              const url = await uploadDocument(authData.user.id, file);
              uploadedDocUrls.push(url);
            } catch (uploadErr) {
              console.error("Erro no upload de documento de registro:", uploadErr);
            }
          }
        }

        // 4. Criar o perfil detalhado na tabela 'perfis'
        console.log("Upserting profile to 'perfis' table...");
        const profileData = {
          id: authData.user.id,
          email: cleanEmail,
          nome_completo: cleanName,
          tipo_usuario: finalType,
          telefone: '',
          bio: '',
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

        const { error: profileError } = await supabase
          .from('perfis')
          .upsert(profileData);

        if (profileError) {
          console.error("Erro detalhado na criação do perfil:", profileError);
          setError("Sua conta foi criada, mas houve um erro ao configurar seu perfil (" + profileError.message + "). Tente fazer login.");
        } else {
          console.log("Profile created successfully!");
          const { toast } = await import('sonner');
          toast.success('Cadastro realizado com sucesso!', {
            description: 'Sua conta foi configurada. Faça login para continuar.'
          });
          navigate('/login');
        }
      }
    } catch (err: any) {
      console.error("Erro inesperado durante o cadastro:", err);
      setError(err.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Criar Conta</h2>
          <p className="text-base text-slate-500 mt-2">Escolha seu perfil e comece agora.</p>
        </div>

        <div className="mb-8">
          <label className="block text-base font-semibold text-slate-700 mb-2">Tipo de Usuário</label>
          <select
            name="tipo_usuario"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as 'paciente' | 'fisioterapeuta')}
            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base transition-all"
          >
            <option value="paciente">Paciente</option>
            <option value="fisioterapeuta">Fisioterapeuta</option>
          </select>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {role === 'fisioterapeuta' && (
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Como você prefere ser chamado(a)?</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-sm font-bold border transition-all",
                    gender === 'male' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  Dr.
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-sm font-bold border transition-all",
                    gender === 'female' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  Dra.
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Nome Completo</label>
            <div className="relative">
              <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-base"
                placeholder="Seu nome"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">CEP</label>
            <input
              type="text"
              required
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
              placeholder="00000-000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-2">Cidade</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
                placeholder="Sua cidade"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-2">País</label>
              <input
                type="text"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
                placeholder="Seu país"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Endereço Completo</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
              placeholder="Rua, número, bairro..."
            />
          </div>

          {role === 'fisioterapeuta' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6"
            >
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">CREFITO</label>
                <input
                  type="text"
                  required={role === 'fisioterapeuta'}
                  value={crefito}
                  onChange={(e) => setCrefito(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
                  placeholder="Ex: 12345-F"
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Especialidade</label>
                <input
                  type="text"
                  required={role === 'fisioterapeuta'}
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
                  placeholder="Ex: Ortopedia, Neuro..."
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Tipo de Atendimento</label>
                <select
                  value={serviceType}
                  onChange={(e: any) => setServiceType(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
                >
                  <option value="domicilio">A Domicílio</option>
                  <option value="online">Online</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Documentos Profissionais (PDF/Imagens)</label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setRegistrationDocs(Array.from(e.target.files));
                      }
                    }}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">Anexe seu CREFITO e documentos de identificação para validação.</p>
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Chave Pro (Opcional)</label>
                <input
                  type="text"
                  value={proKey}
                  onChange={(e) => setProKey(e.target.value.toUpperCase())}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base font-mono tracking-widest"
                  placeholder="INSIRA SUA CHAVE PRO"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Se você possui uma chave de ativação, insira-a aqui para liberar recursos Pro.</p>
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-base"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-base"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-4 rounded-2xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500 font-medium">ou continuar com</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold text-base hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>
        </form>

        <p className="text-center mt-8 text-base text-slate-500">
          Já tem uma conta? <Link to="/login" className="text-blue-600 font-bold hover:underline">Entrar</Link>
        </p>
      </motion.div>
    </div>
  );
}
