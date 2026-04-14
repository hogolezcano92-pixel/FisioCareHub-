import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { User, Stethoscope, Mail, Lock, UserCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import Logo from '../components/Logo';
import { uploadPhysioDocument } from '../services/supabaseStorage';
import { sendWelcomeEmail } from '../services/emailService';

export default function Register() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<'paciente' | 'fisioterapeuta'>(() => {
    const saved = localStorage.getItem('pending_role');
    return (saved === 'fisioterapeuta' || saved === 'paciente') ? saved : 'paciente';
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleRoleChange = (newRole: 'paciente' | 'fisioterapeuta') => {
    console.log("Setting role to:", newRole);
    setRole(newRole);
    localStorage.setItem('pending_role', newRole);
  };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    telefone: '',
    bio: '',
    zipCode: '',
    city: '',
    country: 'Brasil',
    address: '',
    crefito: '',
    specialty: '',
    serviceType: 'ambos' as 'domicilio' | 'online' | 'ambos',
    gender: '' as 'male' | 'female' | 'other' | '',
    proKey: '',
    rg_frente: null as File | null,
    rg_verso: null as File | null,
    crefito_frente: null as File | null,
    crefito_verso: null as File | null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [registrationDocs, setRegistrationDocs] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Salva o papel selecionado para que o AuthContext saiba qual perfil criar
      localStorage.setItem('pending_role', role);
      
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
    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim();
    const isPro = role === 'fisioterapeuta' && formData.proKey.trim().toUpperCase() === 'PRO2024';

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

    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    if (role === 'fisioterapeuta') {
      if (!formData.crefito.trim()) {
        setError("O CREFITO é obrigatório para fisioterapeutas.");
        setLoading(false);
        return;
      }
      // Simple CREFITO validation: at least 4 digits
      if (!/^\d{4,}/.test(formData.crefito.trim())) {
        setError("Por favor, insira um CREFITO válido.");
        setLoading(false);
        return;
      }

      if (!formData.rg_frente || !formData.rg_verso || !formData.crefito_frente || !formData.crefito_verso) {
        setError("Todos os documentos (RG e CREFITO) são obrigatórios para fisioterapeutas.");
        setLoading(false);
        return;
      }
    }

    // CEP validation (8 digits, ignore non-digits)
    const cleanZip = formData.zipCode.replace(/\D/g, '');
    if (cleanZip.length !== 8) {
      setError("Por favor, insira um CEP válido com 8 dígitos.");
      setLoading(false);
      return;
    }

    try {
      console.log("Starting registration for:", cleanEmail, "Role:", role);
      // Salva o papel selecionado como fallback
      localStorage.setItem('pending_role', role);
      
      // 2. Criar o usuário no Supabase Auth com metadados COMPLETOS
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            full_name: cleanName,
            tipo_usuario: role,
            plano: role === 'fisioterapeuta' ? 'fisioterapeuta' : 'free',
            crefito: role === 'fisioterapeuta' ? formData.crefito : null,
            especialidade: role === 'fisioterapeuta' ? formData.specialty : null,
            telefone: formData.telefone,
            bio: formData.bio,
            localizacao: formData.city,
            endereco: formData.address,
            cep: formData.zipCode,
            pais: formData.country,
            genero: role === 'fisioterapeuta' ? formData.gender : null,
            tipo_servico: role === 'fisioterapeuta' ? formData.serviceType : null,
            is_pro: isPro,
            rg_frente_url: null,
            rg_verso_url: null,
            crefito_frente_url: null,
            crefito_verso_url: null
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
        
        // Disparar e-mail de boas-vindas (não bloqueia o fluxo)
        sendWelcomeEmail(cleanEmail, cleanName, role as 'paciente' | 'fisioterapeuta');

        // 3. Upload de documentos obrigatórios se for fisioterapeuta
        let docUrls = {
          rg_frente: null as string | null,
          rg_verso: null as string | null,
          crefito_frente: null as string | null,
          crefito_verso: null as string | null
        };

        if (role === 'fisioterapeuta' && authData.user) {
          try {
            console.log("Uploading mandatory documents...");
            const uploads = [
              { file: formData.rg_frente!, type: 'rg_frente' as const },
              { file: formData.rg_verso!, type: 'rg_verso' as const },
              { file: formData.crefito_frente!, type: 'crefito_frente' as const },
              { file: formData.crefito_verso!, type: 'crefito_verso' as const }
            ];

            const results = await Promise.all(
              uploads.map(u => uploadPhysioDocument(authData.user!.id, u.file, u.type))
            );

            docUrls = {
              rg_frente: results[0],
              rg_verso: results[1],
              crefito_frente: results[2],
              crefito_verso: results[3]
            };
          } catch (uploadErr: any) {
            console.error("Erro no upload de documentos obrigatórios:", uploadErr);
          }
        }

        // 4. Upload de documentos adicionais se houver
        const uploadedDocUrls: string[] = [];
        if (role === 'fisioterapeuta' && registrationDocs.length > 0) {
          console.log("Uploading additional documents...");
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

        // 5. Criar o perfil detalhado na tabela 'perfis'
        console.log("Upserting profile to 'perfis' table...");
        
        const fullProfileData = {
          id: authData.user.id,
          nome_completo: cleanName,
          plano: role === 'fisioterapeuta' ? 'fisioterapeuta' : 'free',
          tipo_usuario: role,
          email: cleanEmail,
          localizacao: formData.city || null,
          endereco: formData.address || null,
          cep: formData.zipCode || null,
          pais: formData.country || null,
          crefito: role === 'fisioterapeuta' ? (formData.crefito || null) : null,
          especialidade: role === 'fisioterapeuta' ? (formData.specialty || null) : null,
          genero: role === 'fisioterapeuta' ? (formData.gender || null) : null,
          tipo_servico: role === 'fisioterapeuta' ? (formData.serviceType || null) : null,
          is_pro: isPro,
          status_aprovacao: role === 'paciente' ? 'aprovado' : 'pendente',
          rg_frente_url: docUrls.rg_frente,
          rg_verso_url: docUrls.rg_verso,
          crefito_frente_url: docUrls.crefito_frente,
          crefito_verso_url: docUrls.crefito_verso,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanName.replace(/\s+/g, '_')}`,
          telefone: formData.telefone,
          bio: formData.bio,
          documentos: uploadedDocUrls,
          created_at: new Date().toISOString()
        };

        // We try to upsert. If it fails (e.g. email confirmation required), 
        // the AuthContext will handle it upon first login.
        try {
          const { error: profileError } = await supabase
            .from('perfis')
            .upsert(fullProfileData);

          if (profileError) {
            console.warn("Manual profile upsert failed (expected if email confirmation is on):", profileError.message);
          } else {
            console.log("Profile created successfully in DB.");
          }
        } catch (err) {
          console.warn("Error during manual profile upsert:", err);
        }

        // 5. Create subscription record if Pro Key was used
        if (isPro) {
          console.log("Creating subscription record for Pro Key...");
          try {
            await supabase.from('assinaturas').insert({
              user_id: authData.user.id,
              plano: 'pro',
              status: 'ativo',
              valor: 0,
              data_inicio: new Date().toISOString(),
              data_expiracao: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            });
          } catch (err) {
            console.warn("Erro ao criar assinatura inicial:", err);
          }
        }

        const { toast } = await import('sonner');
        toast.success('Cadastro realizado com sucesso!', {
          description: 'Sua conta foi configurada. Faça login para continuar.'
        });
        navigate('/login');
      }
    } catch (err: any) {
      console.error("Erro inesperado durante o cadastro:", err);
      setError(err.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-10 px-4 sm:px-6">
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
                  onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-sm font-bold border transition-all",
                    formData.gender === 'male' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  Dr.
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-sm font-bold border transition-all",
                    formData.gender === 'female' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
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
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-base"
                placeholder="Seu nome"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Telefone</label>
            <input
              type="tel"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Biografia / Histórico</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="w-full h-24 px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base resize-none"
              placeholder={role === 'fisioterapeuta' ? "Conte sobre sua formação..." : "Conte um pouco sobre seu histórico de saúde..."}
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">CEP</label>
            <input
              type="text"
              name="zipCode"
              required
              value={formData.zipCode}
              onChange={handleChange}
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
              placeholder="00000-000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-2">Cidade</label>
              <input
                type="text"
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
                placeholder="Sua cidade"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-2">País</label>
              <input
                type="text"
                name="country"
                required
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
                placeholder="Seu país"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Endereço Completo</label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
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
                  name="crefito"
                  required={role === 'fisioterapeuta'}
                  value={formData.crefito}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
                  placeholder="Ex: 12345-F"
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Especialidade</label>
                <input
                  type="text"
                  name="specialty"
                  required={role === 'fisioterapeuta'}
                  value={formData.specialty}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
                  placeholder="Ex: Ortopedia, Neuro..."
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Tipo de Atendimento</label>
                <select
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-base"
                >
                  <option value="domicilio">A Domicílio</option>
                  <option value="online">Online</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Documentos Obrigatórios (RG e CREFITO)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">RG Frente</label>
                    <input
                      type="file"
                      name="rg_frente"
                      accept="image/*,application/pdf"
                      required
                      onChange={handleFileChange}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">RG Verso</label>
                    <input
                      type="file"
                      name="rg_verso"
                      accept="image/*,application/pdf"
                      required
                      onChange={handleFileChange}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">CREFITO Frente</label>
                    <input
                      type="file"
                      name="crefito_frente"
                      accept="image/*,application/pdf"
                      required
                      onChange={handleFileChange}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">CREFITO Verso</label>
                    <input
                      type="file"
                      name="crefito_verso"
                      accept="image/*,application/pdf"
                      required
                      onChange={handleFileChange}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">O envio dos documentos é obrigatório para a aprovação do seu cadastro profissional.</p>
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Chave Pro (Opcional)</label>
                <input
                  type="text"
                  name="proKey"
                  value={formData.proKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, proKey: e.target.value.toUpperCase() }))}
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
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
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
