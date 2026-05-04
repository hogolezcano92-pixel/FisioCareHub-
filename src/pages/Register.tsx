import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { User, Stethoscope, Mail, Lock, UserCircle, Loader2, Eye, EyeOff, CreditCard } from 'lucide-react';
import { cn, formatCPF, validateCPF } from '../lib/utils';
import Logo from '../components/Logo';
import { uploadPhysioDocument } from '../services/supabaseStorage';
import { sendWelcomeEmail } from '../services/emailService';
import { toast } from 'sonner';

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
    cpf: '',
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
    if (name === 'cpf') {
      setFormData(prev => ({ ...prev, [name]: formatCPF(value) }));
      return;
    }
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

    if (formData.cpf && !validateCPF(formData.cpf)) {
      setError("CPF inválido. Por favor, verifique os dígitos.");
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
            nome_completo: cleanName,
            telefone: formData.telefone,
            cpf_cnpj: formData.cpf.replace(/\D/g, ''),
            role: role,
            tipo_usuario: role, // Mantido para compatibilidade
            status_aprovacao: role === 'paciente' ? 'aprovado' : 'pendente',
            plano: role === 'fisioterapeuta' ? 'fisioterapeuta' : 'free',
            crefito: role === 'fisioterapeuta' ? formData.crefito : null,
            especialidade: role === 'fisioterapeuta' ? formData.specialty : null,
            crefito_numero: role === 'fisioterapeuta' ? formData.crefito : null,
            especialidade_principal: role === 'fisioterapeuta' ? formData.specialty : null,
            bio: formData.bio,
            localizacao: formData.city,
            endereco: formData.address,
            cep: formData.zipCode,
            pais: formData.country,
            genero: role === 'fisioterapeuta' ? formData.gender : null,
            tipo_servico: role === 'fisioterapeuta' ? formData.serviceType : null,
            is_pro: isPro
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
          crefito_numero: role === 'fisioterapeuta' ? (formData.crefito || null) : null,
          especialidade_principal: role === 'fisioterapeuta' ? (formData.specialty || null) : null,
          genero: role === 'fisioterapeuta' ? (formData.gender || null) : null,
          tipo_servico: role === 'fisioterapeuta' ? (formData.serviceType || null) : null,
          is_pro: isPro,
          status_aprovacao: role === 'paciente' ? 'aprovado' : 'pendente',
          rg_frente_url: docUrls.rg_frente,
          rg_verso_url: docUrls.rg_verso,
          crefito_frente_url: docUrls.crefito_frente,
          crefito_verso_url: docUrls.crefito_verso,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanName.replace(/\s+/g, '_')}`,
          cpf_cnpj: formData.cpf.replace(/\D/g, ''),
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

        toast.success('Cadastro realizado com sucesso!', {
          description: 'Sua conta foi configurada. Faça login para continuar.'
        });

        // 6. Notify admins if it's a physiotherapist registration
        if (role === 'fisioterapeuta') {
          const { data: admins } = await supabase
            .from('perfis')
            .select('id')
            .eq('tipo_usuario', 'admin');

          if (admins && admins.length > 0) {
            const notifications = admins.map(admin => ({
              user_id: admin.id,
              titulo: 'Novo Fisioterapeuta',
              mensagem: `O Dr(a). ${cleanName} se cadastrou e aguarda aprovação de perfil.`,
              tipo: 'support_request',
              link: '/admin'
            }));

            await supabase.from('notificacoes').insert(notifications);
          }
        }

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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-xl w-full relative z-10"
      >
        <div className="bg-card/50 backdrop-blur-2xl p-8 sm:p-12 rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/10">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <Logo size="md" variant="light" />
            </div>
            <h2 className="text-3xl font-display font-black text-white tracking-tight">Criar Conta</h2>
            <p className="text-slate-400 mt-2 font-medium">Escolha seu perfil e comece sua jornada.</p>
          </div>

          <div className="mb-8">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Tipo de Usuário</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleRoleChange('paciente')}
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all",
                  role === 'paciente' 
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                )}
              >
                <User size={24} />
                <span className="text-sm font-black">Paciente</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('fisioterapeuta')}
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all",
                  role === 'fisioterapeuta' 
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                )}
              >
                <Stethoscope size={24} />
                <span className="text-sm font-black">Fisioterapeuta</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {role === 'fisioterapeuta' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4"
              >
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Como você prefere ser chamado(a)?</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                    className={cn(
                      "flex-1 py-3 rounded-2xl text-xs font-black border transition-all",
                      formData.gender === 'male' ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-800 border-white/10 text-slate-400 hover:border-white/20"
                    )}
                  >
                    Dr.
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                    className={cn(
                      "flex-1 py-3 rounded-2xl text-xs font-black border transition-all",
                      formData.gender === 'female' ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-800 border-white/10 text-slate-400 hover:border-white/20"
                    )}
                  >
                    Dra.
                  </button>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                <div className="relative group">
                  <div 
                    className="absolute flex items-center justify-center pointer-events-none z-20"
                    style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px' }}
                  >
                    <UserCircle className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pr-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all !pl-[60px]"
                    placeholder="Seu nome"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Telefone</label>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">CPF</label>
                <div className="relative group">
                  <div 
                    className="absolute flex items-center justify-center pointer-events-none z-20"
                    style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px' }}
                  >
                    <CreditCard className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  </div>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    className="w-full pr-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all !pl-[60px]"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Biografia / Histórico</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="w-full px-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all h-24 resize-none"
                placeholder={role === 'fisioterapeuta' ? "Conte sobre sua formação e experiência..." : "Conte um pouco sobre seu histórico de saúde..."}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">CEP</label>
                <input
                  type="text"
                  name="zipCode"
                  required
                  value={formData.zipCode}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="00000-000"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Cidade</label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Sua cidade"
                />
              </div>
              <div className="space-y-2 md:col-span-1 col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">País</label>
                <input
                  type="text"
                  name="country"
                  required
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Seu país"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Endereço Completo</label>
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Rua, número, bairro..."
              />
            </div>

            {role === 'fisioterapeuta' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">CREFITO</label>
                    <input
                      type="text"
                      name="crefito"
                      required={role === 'fisioterapeuta'}
                      value={formData.crefito}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Ex: 12345-F"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Especialidade</label>
                    <input
                      type="text"
                      name="specialty"
                      required={role === 'fisioterapeuta'}
                      value={formData.specialty}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Ex: Ortopedia, Neuro..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Tipo de Atendimento</label>
                  <select
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleChange}
                    className="w-full px-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="domicilio" className="bg-slate-900">A Domicílio</option>
                    <option value="online" className="bg-slate-900">Online</option>
                    <option value="ambos" className="bg-slate-900">Ambos</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Documentos Obrigatórios</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'RG Frente', name: 'rg_frente' },
                      { label: 'RG Verso', name: 'rg_verso' },
                      { label: 'CREFITO Frente', name: 'crefito_frente' },
                      { label: 'CREFITO Verso', name: 'crefito_verso' }
                    ].map((doc) => (
                      <div key={doc.name} className="p-4 bg-white/10 border border-white/10 rounded-2xl space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{doc.label}</label>
                        <input
                          type="file"
                          name={doc.name}
                          accept="image/*,application/pdf"
                          required
                          onChange={handleFileChange}
                          className="w-full text-[10px] text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Chave Pro (Opcional)</label>
                  <input
                    type="text"
                    name="proKey"
                    value={formData.proKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, proKey: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono tracking-widest"
                    placeholder="INSIRA SUA CHAVE PRO"
                  />
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">E-mail</label>
                <div className="relative group">
                  <div 
                    className="absolute flex items-center justify-center pointer-events-none z-20"
                    style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px' }}
                  >
                    <Mail className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pr-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all !pl-[60px]"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Senha</label>
                <div className="relative group">
                  <div 
                    className="absolute flex items-center justify-center pointer-events-none z-20"
                    style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px' }}
                  >
                    <Lock className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pr-12 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all !pl-[60px]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs bg-red-500/10 p-4 rounded-2xl border border-red-500/20 font-medium"
              >
                {error}
              </motion.p>
            )}

            {role === 'fisioterapeuta' && (
              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('toggle-help-center', { 
                    detail: { search: 'cadastro', profile: 'fisioterapeuta' } 
                  }))}
                  className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-400 transition-colors"
                >
                  Dúvidas sobre o cadastro? Fale conosco
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-base shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Criar Minha Conta'}
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black">
                <span className="px-4 bg-transparent text-slate-600">ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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

          <p className="text-center mt-10 text-sm text-slate-500 font-medium">
            Já tem uma conta? <Link to="/login" className="text-blue-400 font-black hover:text-blue-300 transition-colors">Entrar</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
