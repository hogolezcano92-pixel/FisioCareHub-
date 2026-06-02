import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ListSkeleton } from '../components/Skeleton';
import { 
  User, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  MoreVertical,
  X,
  Loader2,
  Trash2,
  Edit2,
  ChevronRight,
  Camera
} from 'lucide-react';
import { formatDate, cn, resolveStorageUrl } from '../lib/utils';
import { toast } from 'sonner';
import { getEffectivePlan, getPatientLimitByPlan, getPlanLabel } from '../lib/planAccess';

export default function Patients() {
  const { user, profile, subscription } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [menuPatientId, setMenuPatientId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    diagnostico: '',
    observacoes: '',
    foto_url: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);


  const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

  const resolvePatientPhoto = (patient: any, profileData?: any) => (
    patient?.foto_url ||
    patient?.avatar_url ||
    profileData?.foto_url ||
    profileData?.avatar_url ||
    null
  );

  const enrichPatientsWithProfiles = async (basePatients: any[]) => {
    const profileIds = Array.from(new Set(
      basePatients
        .flatMap((patient: any) => [patient?.perfil_id, patient?.profile_id, patient?.user_id, patient?.auth_user_id, patient?.paciente_id])
        .filter(Boolean)
        .map(String)
    ));

    const emails = Array.from(new Set(
      basePatients
        .map((patient: any) => normalizeEmail(patient?.email))
        .filter(Boolean)
    ));

    const profilesById = new Map<string, any>();
    const profilesByEmail = new Map<string, any>();

    if (profileIds.length > 0) {
      const { data: profilesByIdData, error: profilesByIdError } = await supabase
        .from('perfis')
        .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url, tipo_usuario, role')
        .in('id', profileIds);

      if (profilesByIdError) {
        console.warn('DEBUG: Não foi possível enriquecer pacientes por perfil_id:', profilesByIdError);
      }

      (profilesByIdData || []).forEach((profileItem: any) => {
        profilesById.set(String(profileItem.id), profileItem);
        const email = normalizeEmail(profileItem.email);
        if (email) profilesByEmail.set(email, profileItem);
      });
    }

    if (emails.length > 0) {
      const { data: profilesByEmailData, error: profilesByEmailError } = await supabase
        .from('perfis')
        .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url, tipo_usuario, role')
        .in('email', emails);

      if (profilesByEmailError) {
        console.warn('DEBUG: Não foi possível enriquecer pacientes por e-mail:', profilesByEmailError);
      }

      (profilesByEmailData || []).forEach((profileItem: any) => {
        profilesById.set(String(profileItem.id), profileItem);
        const email = normalizeEmail(profileItem.email);
        if (email) profilesByEmail.set(email, profileItem);
      });
    }

    return basePatients.map((patient: any) => {
      const candidateIds = [patient?.perfil_id, patient?.profile_id, patient?.user_id, patient?.auth_user_id, patient?.paciente_id]
        .filter(Boolean)
        .map(String);
      const linkedProfile = candidateIds.map((candidateId) => profilesById.get(candidateId)).find(Boolean)
        || profilesByEmail.get(normalizeEmail(patient?.email));

      return {
        ...patient,
        perfil_id: patient?.perfil_id || linkedProfile?.id || null,
        nome_completo: patient?.nome_completo || linkedProfile?.nome_completo || 'Paciente',
        email: patient?.email || linkedProfile?.email || null,
        telefone: patient?.telefone || linkedProfile?.telefone || null,
        data_nascimento: patient?.data_nascimento || linkedProfile?.data_nascimento || null,
        foto_url: resolvePatientPhoto(patient, linkedProfile),
        avatar_url: patient?.avatar_url || linkedProfile?.avatar_url || linkedProfile?.foto_url || null,
        linked_profile: linkedProfile || null,
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `patient-avatars/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, foto_url: publicUrl }));
      toast.success('Imagem carregada!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao carregar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (profile && profile.tipo_usuario !== 'fisioterapeuta') {
      window.location.href = '/dashboard';
      return;
    }
    if (user) {
      fetchPatients();
    }
    
    // Check for create=true param to auto-open modal
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      openCreatePatientModal();
    }
  }, [user, profile]);

  const fetchPatients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!user?.id) {
        setPatients([]);
        return;
      }

      console.log('DEBUG: Buscando pacientes para o fisioterapeuta:', user.id);

      const { data: clinicalPatients, error: supabaseError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('fisioterapeuta_id', user.id)
        .order('nome_completo');

      if (supabaseError) {
        console.error('DEBUG: Erro detalhado do Supabase ao buscar:', supabaseError);
        throw supabaseError;
      }

      let mergedPatients = await enrichPatientsWithProfiles(clinicalPatients || []);

      // Pacientes que agendaram pelo app usam perfis.id em agendamentos.paciente_id.
      // Se o webhook ainda não criou o vínculo clínico em pacientes, criamos/mostramos aqui
      // para que eles apareçam em Meus Pacientes após agendamento/confirmacao.
      const { data: appointments, error: appointmentsError } = await supabase
        .from('agendamentos')
        .select('id, paciente_id, fisio_id, status, data, hora')
        .eq('fisio_id', user.id)
        .not('paciente_id', 'is', null)
        .order('data', { ascending: false });

      if (appointmentsError) {
        console.warn('DEBUG: Não foi possível buscar pacientes por agendamento:', appointmentsError);
      }

      const appointmentProfileIds = Array.from(
        new Set((appointments || []).map((appointment: any) => appointment.paciente_id).filter(Boolean))
      );

      if (appointmentProfileIds.length > 0) {
        const existingProfileLinks = new Set(
          mergedPatients
            .map((patient: any) => patient.perfil_id || patient.paciente_id)
            .filter(Boolean)
            .map(String)
        );
        const existingEmails = new Set(
          mergedPatients
            .map((patient: any) => patient.email?.trim().toLowerCase())
            .filter(Boolean)
        );

        const missingProfileIds = appointmentProfileIds.filter((profileId) => !existingProfileLinks.has(String(profileId)));

        if (missingProfileIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('perfis')
            .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url')
            .in('id', missingProfileIds);

          if (profilesError) {
            console.warn('DEBUG: Não foi possível buscar perfis de pacientes agendados:', profilesError);
          }

          for (const patientProfile of profiles || []) {
            const normalizedEmail = patientProfile.email?.trim().toLowerCase();
            const alreadyLinkedByEmail = normalizedEmail && existingEmails.has(normalizedEmail);

            if (alreadyLinkedByEmail) continue;

            const payload = {
              perfil_id: patientProfile.id,
              fisioterapeuta_id: user.id,
              nome_completo: patientProfile.nome_completo || 'Paciente',
              email: patientProfile.email || null,
              telefone: patientProfile.telefone || null,
              data_nascimento: patientProfile.data_nascimento || null,
              foto_url: patientProfile.foto_url || patientProfile.avatar_url || null,
              avatar_url: patientProfile.avatar_url || patientProfile.foto_url || null,
              tipo_paciente: 'externo',
              origem: 'agendamento',
              status: 'ativo',
              updated_at: new Date().toISOString()
            };

            const { data: createdPatient, error: createError } = await supabase
              .from('pacientes')
              .insert(payload)
              .select('*')
              .single();

            if (createError) {
              console.warn('DEBUG: Não foi possível criar vínculo clínico completo para paciente agendado:', createError);

              const fallbackPayload = {
                perfil_id: patientProfile.id,
                fisioterapeuta_id: user.id,
                nome_completo: patientProfile.nome_completo || 'Paciente',
                email: patientProfile.email || null,
                telefone: patientProfile.telefone || null,
                data_nascimento: patientProfile.data_nascimento || null,
                foto_url: patientProfile.foto_url || patientProfile.avatar_url || null
              };

              const { data: fallbackPatient, error: fallbackError } = await supabase
                .from('pacientes')
                .insert(fallbackPayload)
                .select('*')
                .single();

              if (fallbackError) {
                console.warn('DEBUG: Não foi possível criar vínculo clínico mínimo para paciente agendado:', fallbackError);
                continue;
              }

              if (fallbackPatient) {
                mergedPatients = [...mergedPatients, fallbackPatient];
                existingProfileLinks.add(String(patientProfile.id));
                if (normalizedEmail) existingEmails.add(normalizedEmail);
              }

              continue;
            }

            if (createdPatient) {
              mergedPatients = [...mergedPatients, createdPatient];
              existingProfileLinks.add(String(patientProfile.id));
              if (normalizedEmail) existingEmails.add(normalizedEmail);
            }
          }
        }
      }

      mergedPatients = await enrichPatientsWithProfiles(mergedPatients);

      console.log('DEBUG: Pacientes encontrados:', mergedPatients.length);
      setPatients(mergedPatients);
    } catch (err: any) {
      console.error('Erro ao buscar pacientes:', err);
      setPatients([]);
      setError(err.message || 'Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPatientForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      data_nascimento: '',
      diagnostico: '',
      observacoes: '',
      foto_url: ''
    });
    setEditingPatient(null);
    setMenuPatientId(null);
  };

  const openCreatePatientModal = () => {
    resetPatientForm();
    setShowModal(true);
  };

  const openEditPatientModal = (patient: any) => {
    setEditingPatient(patient);
    setMenuPatientId(null);
    setFormData({
      nome: patient.nome_completo || patient.nome || '',
      email: patient.email || '',
      telefone: patient.telefone || '',
      data_nascimento: patient.data_nascimento || '',
      diagnostico: patient.diagnostico || '',
      observacoes: patient.observacoes || '',
      foto_url: patient.foto_url || patient.avatar_url || ''
    });
    setShowModal(true);
  };

  const closePatientModal = () => {
    setShowModal(false);
    resetPatientForm();
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!editingPatient) {
      const currentPlan = getEffectivePlan(profile, subscription);
      const patientLimit = getPatientLimitByPlan(currentPlan);

      if (patientLimit !== null && patients.length >= patientLimit) {
        toast.error(`Limite do Plano ${getPlanLabel(currentPlan)} atingido`, {
          description: currentPlan === 'free'
            ? 'No plano gratuito, você pode cadastrar até 3 pacientes internos. Faça upgrade para o Basic ou PRO para liberar mais pacientes.'
            : 'Faça upgrade para liberar mais pacientes.'
        });
        setShowModal(false);
        navigate('/subscription');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (!user?.id) {
        throw new Error('Usuário não identificado para salvar o paciente.');
      }

      const payload = {
        nome_completo: formData.nome.trim(),
        email: formData.email.trim() || null,
        telefone: formData.telefone.trim() || null,
        data_nascimento: formData.data_nascimento || null,
        diagnostico: formData.diagnostico.trim() || null,
        observacoes: formData.observacoes.trim() || null,
        foto_url: formData.foto_url || null,
        fisioterapeuta_id: user.id
      };

      if (editingPatient?.id) {
        const { error: updateError } = await supabase
          .from('pacientes')
          .update(payload)
          .eq('id', editingPatient.id)
          .eq('fisioterapeuta_id', user.id);

        if (updateError) throw updateError;
        toast.success('Paciente atualizado com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('pacientes')
          .insert([payload]);

        if (insertError) throw insertError;
        toast.success('Paciente cadastrado com sucesso!');
      }

      closePatientModal();
      fetchPatients();
    } catch (err: any) {
      console.error('Erro ao salvar paciente:', err);
      toast.error(err?.message || 'Erro ao salvar paciente');
    } finally {
      setSubmitting(false);
    }
  };

  const ignoreMissingRelationError = (error: any) => {
    const message = String(error?.message || error?.details || error?.hint || '').toLowerCase();
    return (
      message.includes('does not exist') ||
      message.includes('could not find') ||
      message.includes('schema cache') ||
      message.includes('relation') ||
      message.includes('column')
    );
  };

  const isRpcUnavailableError = (error: any) => {
    const message = String(error?.message || error?.details || error?.hint || '').toLowerCase();
    return (
      message.includes('function') ||
      message.includes('rpc') ||
      message.includes('schema cache') ||
      message.includes('could not find') ||
      message.includes('does not exist')
    );
  };

  const resolvePatientDeleteIds = (patient: any) => {
    return Array.from(new Set([
      patient?.id,
      patient?.perfil_id,
      patient?.profile_id,
      patient?.user_id,
      patient?.auth_user_id,
      patient?.paciente_id,
      patient?.linked_profile?.id,
    ].filter(Boolean).map(String)));
  };

  const deleteFromTableByPatientIds = async (table: string, patientIds: string[]) => {
    if (patientIds.length === 0) return;

    const { error } = await supabase
      .from(table)
      .delete()
      .in('paciente_id', patientIds);

    if (error && !ignoreMissingRelationError(error)) {
      throw error;
    }
  };

  const deletePatientLinkedRowsFallback = async (patient: any) => {
    const patientIds = resolvePatientDeleteIds(patient);

    // Apaga primeiro filhos/dependências para evitar bloqueio por FK e dados órfãos.
    const linkedTablesByPacienteId = [
      'protocolo_itens',
      'protocolos_prescricao',
      'checklist_exercicios',
      'diario_dor',
      'registros_paciente',
      'exercicios_paciente',
      'evolucoes',
      'arquivos_paciente',
      'triagens',
      'prontuarios',
      'avaliacoes',
      'documentos_gerados',
      'fichas_avaliacao',
      'sessoes',
      'soap_notes',
      'patient_exercises',
      'exam_analyses',
      'solicitacoes_atendimento',
    ];

    for (const table of linkedTablesByPacienteId) {
      await deleteFromTableByPatientIds(table, patientIds);
    }

    // Agendamentos desse fisioterapeuta podem estar salvos com pacientes.id ou perfis.id.
    const { error: appointmentsError } = await supabase
      .from('agendamentos')
      .delete()
      .eq('fisio_id', user!.id)
      .in('paciente_id', patientIds);

    if (appointmentsError && !ignoreMissingRelationError(appointmentsError)) {
      throw appointmentsError;
    }

    // Logs/notificações podem guardar o ID como texto em referencia_id.
    for (const referenceTable of ['historico_atividades', 'notificacoes']) {
      const { error } = await supabase
        .from(referenceTable)
        .delete()
        .in('referencia_id', patientIds);

      if (error && !ignoreMissingRelationError(error)) {
        throw error;
      }
    }
  };

  const deletePatientCascade = async (patient: any) => {
    const { data, error } = await supabase.rpc('delete_clinical_patient_cascade', {
      p_patient_id: patient.id,
    });

    if (!error) return data;

    // Enquanto a RPC ainda não estiver aplicada no Supabase, usamos fallback no frontend.
    // Se a RPC existir e falhar por permissão/vínculo, o erro é exibido para não dar falso sucesso.
    if (!isRpcUnavailableError(error)) {
      throw error;
    }

    console.warn('RPC delete_clinical_patient_cascade indisponível. Usando fallback frontend:', error);
    await deletePatientLinkedRowsFallback(patient);

    const { error: deleteError } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', patient.id)
      .eq('fisioterapeuta_id', user!.id);

    if (deleteError) throw deleteError;
  };

  const handleDeletePatient = async (patient: any) => {
    if (!user || !patient?.id) return;

    const confirmed = window.confirm(`Deseja apagar o paciente ${patient.nome_completo || 'selecionado'} e todos os dados clínicos vinculados? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await deletePatientCascade(patient);

      const patientIds = resolvePatientDeleteIds(patient);
      setPatients((current) => current.filter((item) => !patientIds.includes(String(item.id))));
      toast.success('Paciente apagado com sucesso!');
      setMenuPatientId(null);
      await fetchPatients();
    } catch (err: any) {
      console.error('Erro ao apagar paciente:', err);
      toast.error(err?.message || 'Erro ao apagar paciente. Verifique as permissões/RLS ou aplique a função SQL de exclusão em cascata.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = useMemo(() => {
    // Garantir que não existam duplicatas por ID caso haja inconsistência no banco ou fetch
    const uniquePatientsMap = new Map();
    patients.forEach(p => {
      if (!uniquePatientsMap.has(p.id)) {
        uniquePatientsMap.set(p.id, p);
      }
    });
    
    return Array.from(uniquePatientsMap.values()).filter(p => 
      p.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [patients, search]);

  if (isLoading) {
    return (
      <div className="space-y-8 pt-10 md:pt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
          </div>
          <div className="h-14 w-40 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        </div>
        <ListSkeleton count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full box-border overflow-wrap-break-word pt-10 md:pt-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Meus Pacientes</h1>
          <p className="text-slate-400 font-medium text-xs">Gerencie sua base de pacientes e prontuários.</p>
        </div>
        <button
          onClick={openCreatePatientModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-sky-900/20"
        >
          <Plus size={16} />
          Novo Paciente
        </button>
      </header>

      <div className="relative w-full">
        <Search 
          className="absolute pointer-events-none z-20" 
          style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
        />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-compact pr-4 !pl-[60px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full bg-slate-900/50 backdrop-blur-xl !p-12 rounded-[2.5rem] border border-white/10 text-center w-full shadow-2xl">
            <div className="w-16 h-16 bg-white/5 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <User size={32} />
            </div>
            <h3 className="text-lg font-black text-white">Nenhum paciente encontrado</h3>
            <p className="text-slate-400 mt-1 text-xs font-medium">Comece cadastrando seu primeiro paciente.</p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="relative bg-slate-900/50 backdrop-blur-xl !p-6 rounded-[2.5rem] border border-white/10 group cursor-pointer hover:border-sky-500/30 transition-all shadow-xl hover:shadow-sky-900/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-sky-400 overflow-hidden border border-white/10 shadow-inner group-hover:scale-105 transition-transform">
                      {patient.foto_url ? (
                        <img src={resolveStorageUrl(patient.foto_url)} alt={patient.nome_completo} className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white leading-tight group-hover:text-sky-400 transition-colors">
                        {patient.nome_completo}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                          Ativo
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuPatientId(menuPatientId === patient.id ? null : patient.id);
                      }}
                      className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      aria-label="Abrir opções do paciente"
                    >
                      <MoreVertical size={18} />
                    </button>

                    <AnimatePresence>
                      {menuPatientId === patient.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -6 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-11 z-50 w-44 rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden p-1"
                        >
                          <button
                            type="button"
                            onClick={() => openEditPatientModal(patient)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-black text-slate-200 hover:bg-white/10 rounded-xl transition-all"
                          >
                            <Edit2 size={14} className="text-sky-400" />
                            Editar dados
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePatient(patient);
                            }}
                            disabled={submitting}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-black text-red-300 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            Apagar paciente
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Diagnóstico</p>
                    <p className="text-xs font-bold text-slate-300 line-clamp-1">{patient.diagnostico || 'Sem diagnóstico registrado'}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {patient.email && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <Mail size={12} className="text-sky-400" />
                        <span className="truncate">{patient.email}</span>
                      </div>
                    )}
                    {patient.telefone && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <Phone size={12} className="text-sky-400" />
                        <span className="truncate">{patient.telefone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex -space-x-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[7px] font-bold text-slate-500">
                      {i}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-sky-400 uppercase tracking-widest group-hover:gap-2 transition-all">
                  Ver Prontuário
                  <ChevronRight size={14} />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de Cadastro */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePatientModal}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] box-border"
            >
              <div className="px-4 py-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight uppercase leading-tight">{editingPatient ? 'EDITAR PACIENTE' : 'CADASTRO NOVO PACIENTE'}</h2>
                <button onClick={closePatientModal} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePatient} className="px-4 py-4 sm:p-5 space-y-4 overflow-y-auto">
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="patient-photo-modal"
                    />
                    <label 
                      htmlFor="patient-photo-modal"
                      className="relative block cursor-pointer transition-all active:scale-95"
                    >
                      <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-slate-600 border-2 border-dashed border-white/10 overflow-hidden hover:border-sky-500/50 transition-colors">
                        {formData.foto_url ? (
                          <img src={resolveStorageUrl(formData.foto_url)} className="w-full h-full object-cover" />
                        ) : (
                          uploadingImage ? <Loader2 className="animate-spin text-sky-400" size={24} /> : <Camera size={28} />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 p-2 bg-blue-600 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                        {uploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="input-compact w-full max-w-full min-w-0 box-border"
                      placeholder="Ex: João Silva"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input-compact w-full max-w-full min-w-0 box-border"
                      placeholder="joao@email.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      className="input-compact w-full max-w-full min-w-0 box-border"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                      className="input-compact w-full max-w-full min-w-0 box-border appearance-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Diagnóstico Clínico</label>
                  <input
                    type="text"
                    value={formData.diagnostico}
                    onChange={(e) => setFormData({...formData, diagnostico: e.target.value})}
                    className="input-compact w-full max-w-full min-w-0 box-border"
                    placeholder="Ex: Hérnia de disco L4-L5"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações Iniciais</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="input-compact w-full max-w-full min-w-0 box-border h-20 resize-none"
                    placeholder="Alguma observação importante sobre o paciente..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 mb-1 bg-sky-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : editingPatient ? 'Atualizar Paciente' : 'Salvar Paciente'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
