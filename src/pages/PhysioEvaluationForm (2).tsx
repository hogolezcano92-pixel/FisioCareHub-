import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  Loader2, 
  FileDown,
  Info,
  Activity,
  Heart,
  Stethoscope,
  Brain,
  ClipboardList
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import ProGuard from '../components/ProGuard';

interface EvaluationForm {
  paciente_id: string;
  queixa_principal: string;
  historia_doenca_atual: string;
  historico_medico: string;
  medicamentos: string;
  antecedentes_familiares: string;
  habitos_vida: string;
  nivel_funcional: string;
  independencia_funcional: string;
  marcha: string;
  postura: string;
  inspecao: string;
  palpacao: string;
  amplitude_movimento: string;
  forca_muscular: string;
  escala_dor: number;
  testes_especiais: string;
  diagnostico_fisio: string;
  objetivos_terapeuticos: string;
  prognostico: string;
  conduta: string;
  frequencia_sessoes: string;
  observacoes_finais: string;
}

const initialForm: EvaluationForm = {
  paciente_id: '',
  queixa_principal: '',
  historia_doenca_atual: '',
  historico_medico: '',
  medicamentos: '',
  antecedentes_familiares: '',
  habitos_vida: '',
  nivel_funcional: '',
  independencia_funcional: '',
  marcha: '',
  postura: '',
  inspecao: '',
  palpacao: '',
  amplitude_movimento: '',
  forca_muscular: '',
  escala_dor: 0,
  testes_especiais: '',
  diagnostico_fisio: '',
  objetivos_terapeuticos: '',
  prognostico: '',
  conduta: '',
  frequencia_sessoes: '',
  observacoes_finais: '',
};

export default function PhysioEvaluationForm() {
  const { id } = useParams(); // evaluation id (if editing)
  const [searchParams] = useSearchParams();
  const pacienteId = searchParams.get('pacienteId');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<EvaluationForm>(initialForm);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
       fetchEvaluation();
    } else if (pacienteId) {
       setFormData(prev => ({ ...prev, paciente_id: pacienteId }));
       fetchPatient(pacienteId);
    } else {
       toast.error('Paciente não especificado');
       navigate('/patients');
    }
  }, [id, pacienteId]);

  const fetchPatient = async (pid: string) => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome_completo, data_nascimento, telefone')
        .eq('id', pid)
        .single();
      if (error) throw error;
      setPatient(data);
    } catch (err) {
      console.error(err);
    } finally {
        if (!id) setLoading(false);
    }
  };

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fichas_avaliacao')
        .select('*, paciente:pacientes(id, nome_completo, data_nascimento, telefone)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setFormData(data);
      setPatient(data.paciente);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar avaliação');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (id) {
        const { error } = await supabase
          .from('fichas_avaliacao')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        toast.success('Avaliação atualizada!');
      } else {
        const { error } = await supabase
          .from('fichas_avaliacao')
          .insert({
            ...formData,
            fisioterapeuta_id: user?.id
          });
        if (error) throw error;
        toast.success('Avaliação salva com sucesso!');
        navigate(`/patient/${pacienteId}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar avaliação: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const generatePDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
    const title = `FICHA DE AVALIAÇÃO FISIOTERAPÊUTICA`;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204);
    doc.text(title, 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 160, 20);
    
    // Patient Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Paciente: ${patient?.nome_completo || 'N/A'}`, 20, 35);
    doc.text(`Data Nasc: ${patient?.data_nascimento ? new Date(patient.data_nascimento).toLocaleDateString() : 'N/A'}`, 20, 42);
    
    let y = 55;

    const sections = [
      { 
        title: 'ANAMNESE', 
        data: [
          ['Queixa Principal', formData.queixa_principal],
          ['História da Doença Atual', formData.historia_doenca_atual],
          ['Histórico Médico', formData.historico_medico],
          ['Medicamentos em Uso', formData.medicamentos],
          ['Hábitos de Vida', formData.habitos_vida]
        ]
      },
      {
        title: 'AVALIAÇÃO FUNCIONAL',
        data: [
          ['Nível Funcional', formData.nivel_funcional],
          ['Independência', formData.independencia_funcional],
          ['Marcha', formData.marcha],
          ['Postura', formData.postura]
        ]
      },
      {
        title: 'EXAME FÍSICO',
        data: [
          ['Escala de Dor', `${formData.escala_dor}/10`],
          ['Inspeção', formData.inspecao],
          ['Palpação', formData.palpacao],
          ['Amplitude de Movimento', formData.amplitude_movimento],
          ['Força Muscular', formData.forca_muscular]
        ]
      },
      {
        title: 'RACIOCÍNIO CLÍNICO E PLANO',
        data: [
          ['Diagnóstico Fisioterapêutico', formData.diagnostico_fisio],
          ['Objetivos Terapêuticos', formData.objetivos_terapeuticos],
          ['Prognóstico', formData.prognostico],
          ['Conduta', formData.conduta],
          ['Frequência', formData.frequencia_sessoes]
        ]
      }
    ];

    sections.forEach(section => {
      autoTable(doc, {
        startY: y,
        head: [[{ content: section.title, colSpan: 2, styles: { fillColor: [50, 50, 50] } }]],
        body: section.data,
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
        margin: { left: 20, right: 20 }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`avaliacao_${patient?.nome_completo || 'paciente'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar o PDF. Verifique os módulos instalados.');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-500" size={48} /></div>;

  return (
    <ProGuard>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-500 font-black hover:text-sky-500 transition-all text-xs uppercase tracking-widest mb-4"
            >
              <ArrowLeft size={16} /> Voltar
            </button>
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Stethoscope className="text-sky-500" size={36} />
              Avaliação Fisioterapêutica
            </h1>
            <p className="text-slate-400 font-medium">Paciente: <span className="text-white font-black">{patient?.nome}</span></p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-6 py-4 bg-white/5 text-slate-400 rounded-2xl font-black hover:bg-white/10 transition-all border border-white/10"
            >
              <FileDown size={20} />
              Exportar PDF
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-4 bg-sky-500 text-white rounded-2xl font-black hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              Salvar Avaliação
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Seção 1: Anamnese */}
          <Section icon={<Brain className="text-purple-400" />} title="Anamnese" color="border-purple-500/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField label="Queixa Principal" value={formData.queixa_principal} onChange={v => setFormData({...formData, queixa_principal: v})} placeholder="O que trouxe o paciente?" />
              <TextField label="História da Doença Atual (HDA)" value={formData.historia_doenca_atual} onChange={v => setFormData({...formData, historia_doenca_atual: v})} />
              <TextField label="Histórico Médico" value={formData.historico_medico} onChange={v => setFormData({...formData, historico_medico: v})} />
              <TextField label="Medicamentos em Uso" value={formData.medicamentos} onChange={v => setFormData({...formData, medicamentos: v})} />
              <TextField label="Antecedentes Familiares" value={formData.antecedentes_familiares} onChange={v => setFormData({...formData, antecedentes_familiares: v})} />
              <TextField label="Hábitos de Vida" value={formData.habitos_vida} onChange={v => setFormData({...formData, habitos_vida: v})} placeholder="Fumante? Atividade física? Sono?" />
            </div>
          </Section>

          {/* Seção 2: Avaliação Funcional */}
          <Section icon={<Activity className="text-emerald-400" />} title="Avaliação Funcional" color="border-emerald-500/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField label="Nível Funcional" value={formData.nivel_funcional} onChange={v => setFormData({...formData, nivel_funcional: v})} />
              <TextField label="Independência Funcional" value={formData.independencia_funcional} onChange={v => setFormData({...formData, independencia_funcional: v})} />
              <TextField label="Marcha" value={formData.marcha} onChange={v => setFormData({...formData, marcha: v})} />
              <TextField label="Postura" value={formData.postura} onChange={v => setFormData({...formData, postura: v})} />
            </div>
          </Section>

          {/* Seção 3: Exame Físico */}
          <Section icon={<Heart className="text-rose-400" />} title="Exame Físico" color="border-rose-500/20">
             <div className="space-y-6">
                <div className="bg-slate-950/50 p-6 rounded-3xl border border-white/5 space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    Escala de Dor (EVA)
                    <span className="text-rose-400 font-black">{formData.escala_dor}/10</span>
                  </label>
                  <input 
                    type="range" min="0" max="10" step="1" 
                    value={formData.escala_dor} 
                    onChange={e => setFormData({...formData, escala_dor: parseInt(e.target.value)})}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500" 
                  />
                  <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                    <span>Sem Dor</span>
                    <span>Moderada</span>
                    <span>Insuportável</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TextField label="Inspeção" value={formData.inspecao} onChange={v => setFormData({...formData, inspecao: v})} />
                  <TextField label="Palpação" value={formData.palpacao} onChange={v => setFormData({...formData, palpacao: v})} />
                  <TextField label="Amplitude de Movimento (ADM)" value={formData.amplitude_movimento} onChange={v => setFormData({...formData, amplitude_movimento: v})} />
                  <TextField label="Força Muscular" value={formData.forca_muscular} onChange={v => setFormData({...formData, forca_muscular: v})} />
                </div>
             </div>
          </Section>

          {/* Seção 4: Testes Especiais */}
          <Section icon={<ClipboardList className="text-amber-400" />} title="Testes Especiais" color="border-amber-500/20">
            <TextField label="Testes Realizados e Resultados" value={formData.testes_especiais} onChange={v => setFormData({...formData, testes_especiais: v})} multiline placeholder="Lachman, gavetas, testes ortopédicos específicos..." />
          </Section>

          {/* Seção 5: Raciocínio Clínico */}
          <Section icon={<Info className="text-sky-400" />} title="Raciocínio Clínico" color="border-sky-500/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField label="Diagnóstico Fisioterapêutico" value={formData.diagnostico_fisio} onChange={v => setFormData({...formData, diagnostico_fisio: v})} multiline />
              <TextField label="Objetivos Terapêuticos" value={formData.objetivos_terapeuticos} onChange={v => setFormData({...formData, objetivos_terapeuticos: v})} multiline />
              <TextField label="Prognóstico" value={formData.prognostico} onChange={v => setFormData({...formData, prognostico: v})} />
            </div>
          </Section>

          {/* Seção 6: Plano */}
          <Section icon={<FileText className="text-slate-400" />} title="Plano e Conduta" color="border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField label="Conduta Proposta" value={formData.conduta} onChange={v => setFormData({...formData, conduta: v})} multiline />
              <div className="space-y-6">
                <TextField label="Frequência de Sessões" value={formData.frequencia_sessoes} onChange={v => setFormData({...formData, frequencia_sessoes: v})} placeholder="Ex: 2x por semana" />
                <TextField label="Observações Finais" value={formData.observacoes_finais} onChange={v => setFormData({...formData, observacoes_finais: v})} multiline />
              </div>
            </div>
          </Section>
        </div>

        <div className="flex justify-end pt-8 border-t border-white/10">
           <button
              onClick={handleSave}
              disabled={submitting}
              className="flex items-center gap-3 px-12 py-5 bg-sky-500 text-white rounded-3xl font-black text-lg hover:bg-sky-600 transition-all shadow-2xl shadow-sky-900/30 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <Save size={24} />}
              Salvar Registro Completo
            </button>
        </div>
      </div>
    </ProGuard>
  );
}

function Section({ icon, title, children, color }: { icon: React.ReactNode, title: string, children: React.ReactNode, color: string }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border transition-all shadow-2xl", color)}
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
          {icon}
        </div>
        <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
      </div>
      {children}
    </motion.section>
  );
}

function TextField({ label, value, onChange, placeholder, multiline }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, multiline?: boolean }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-3xl text-white outline-none focus:ring-2 focus:ring-sky-500 transition-all h-32 resize-none placeholder:text-slate-700 font-medium"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-3xl text-white outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-700 font-medium"
        />
      )}
    </div>
  );
}
