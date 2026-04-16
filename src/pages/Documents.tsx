import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Star, 
  Download, 
  Trash2, 
  Eye, 
  Wand2, 
  ChevronRight,
  FileCheck,
  FileSignature,
  ClipboardCheck,
  FileSearch,
  Library,
  X,
  Loader2,
  CheckCircle2,
  Printer,
  Lock
} from 'lucide-react';
import { generateDocument } from '../lib/groq';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import { createRoot } from 'react-dom/client';
import ProGuard from '../components/ProGuard';

const FAVORITE_TEMPLATES = [
  { id: 'contrato', name: 'Contrato de Prestação', icon: FileSignature, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'atestado', name: 'Atestado de Comparecimento', icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'autorizacao', name: 'Autorização de Imagem', icon: ClipboardCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'laudo', name: 'Laudo/Relatório', icon: FileSearch, color: 'text-purple-600', bg: 'bg-purple-50' },
];

export default function Documents() {
  const { user, profile, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDocumentsData = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        const isPhysio = profile.tipo_usuario === 'fisioterapeuta';
        const { data, error } = await supabase
          .from('documentos_gerados')
          .select('*')
          .eq(isPhysio ? 'physio_id' : 'patient_email', isPhysio ? user.id : user.email)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } catch (err) {
        console.error("Erro ao buscar documentos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentsData();
  }, [user, profile, authLoading]);

  const handleCreateNew = (template?: any) => {
    setSelectedTemplate(template || null);
    setGeneratedContent('');
    setPatientName('');
    setPatientEmail('');
    setAdditionalInfo('');
    setIsModalOpen(true);
  };

  const generateWithAI = async () => {
    if (!patientName) {
      import('sonner').then(({ toast }) => toast.error("Por favor, informe o nome do paciente."));
      return;
    }

    setGenerating(true);
    try {
      const content = await generateDocument(
        selectedTemplate?.name || 'Documento Geral',
        patientName,
        additionalInfo
      );
      setGeneratedContent(content || '');
    } catch (err) {
      console.error("Erro ao gerar com IA:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao gerar documento. Tente novamente."));
    } finally {
      setGenerating(false);
    }
  };

  const saveDocument = async () => {
    if (!generatedContent) return;

    try {
      const { data: newDoc, error } = await supabase
        .from('documentos_gerados')
        .insert({
          physio_id: user?.id,
          physio_name: profile.nome_completo,
          patient_name: patientName,
          patient_email: patientEmail.trim().toLowerCase(),
          type: selectedTemplate?.name || 'Documento Geral',
          content: generatedContent,
        })
        .select()
        .single();

      if (error) throw error;

      setDocuments([newDoc, ...documents]);
      setIsModalOpen(false);
      import('sonner').then(({ toast }) => toast.success("Documento salvo com sucesso!"));
    } catch (err) {
      console.error("Erro ao salvar documento:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao salvar documento."));
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documentos_gerados')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDocuments(documents.filter(d => d.id !== id));
      import('sonner').then(({ toast }) => toast.success("Documento excluído com sucesso."));
    } catch (err) {
      console.error("Erro ao excluir documento:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao excluir documento."));
    } finally {
      setDocToDelete(null);
    }
  };

  const exportToPDF = async (docElementId: string, filename: string) => {
    const element = document.getElementById(docElementId);
    if (!element) return;

    try {
      await document.fonts.ready;
      
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth - 20;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao exportar PDF. Tente novamente."));
    }
  };

  const handleExportFromTable = async (doc: any) => {
    const tempDiv = document.createElement('div');
    tempDiv.id = `export-temp-${doc.id}`;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.padding = '40px';
    tempDiv.style.background = 'white';
    tempDiv.style.color = 'black';
    tempDiv.className = 'prose prose-slate max-w-none';
    
    document.body.appendChild(tempDiv);
    
    const root = createRoot(tempDiv);
    root.render(
      <div style={{ padding: '20px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>{doc.type}</h1>
        <p style={{ marginBottom: '20px' }}><strong>Paciente:</strong> {doc.patient_name}</p>
        <ReactMarkdown>{doc.content}</ReactMarkdown>
        <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          Documento gerado via FisioCareHub em {new Date(doc.created_at).toLocaleDateString()}
        </div>
      </div>
    );

    setTimeout(async () => {
      await exportToPDF(tempDiv.id, `${doc.type}-${doc.patient_name}`);
      document.body.removeChild(tempDiv);
    }, 500);
  };

  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';

  return (
    <ProGuard>
      <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">Documentos e Relatórios</h1>
          <p className="text-slate-400 font-medium">
            {isPhysio 
              ? 'Gerencie sua papelada de forma rápida e automática.' 
              : 'Visualize e baixe seus documentos e relatórios médicos.'}
          </p>
        </div>
        {isPhysio && (
          <button 
            onClick={() => handleCreateNew()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20"
          >
            <Plus size={20} /> CRIAR NOVO DOCUMENTO
          </button>
        )}
      </header>

      {/* Favorites Section - Only for Physio */}
      {isPhysio && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Star className="text-amber-500 fill-amber-500" size={20} />
            <h2 className="text-xl font-black text-white tracking-tight">FAVORITOS</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FAVORITE_TEMPLATES.map((template) => (
              <motion.div
                key={template.id}
                whileHover={{ scale: 1.02 }}
                className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-4 group relative overflow-hidden"
              >
                <div className={`w-12 h-12 ${template.bg.replace('bg-', 'bg-').replace('-50', '-500/10')} ${template.color.replace('text-', 'text-').replace('-600', '-400')} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5`}>
                  <template.icon size={24} />
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => handleCreateNew(template)}>
                  <h3 className="font-black text-white leading-tight">{template.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-widest">Clique para iniciar</p>
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors" title="Remover dos favoritos">
                    <X size={14} />
                  </button>
                  <div className="p-1.5 text-slate-500">
                    <FileText size={14} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Documents */}
      <section className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Library size={20} className="text-blue-400" />
            BIBLIOTECA DE DOCUMENTOS
          </h2>
          <button className="text-blue-400 text-sm font-black uppercase tracking-widest hover:text-blue-300 flex items-center gap-1 transition-colors">
            VER BIBLIOTECA COMPLETA <ChevronRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">{isPhysio ? 'Paciente' : 'Fisioterapeuta'}</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-400" size={32} />
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                    Nenhum documento encontrado.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/20">
                          <FileText size={16} />
                        </div>
                        <span className="font-bold text-white">{doc.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">{isPhysio ? doc.patient_name : (doc.physio_name || 'Fisioterapeuta')}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-bold">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setViewingDoc(doc)}
                          className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                          title="Visualizar"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleExportFromTable(doc)}
                          className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors border border-transparent hover:border-emerald-500/20"
                          title="Baixar PDF"
                        >
                          <Download size={18} />
                        </button>
                        {isPhysio && (
                          <button 
                            onClick={() => setDocToDelete(doc.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {docToDelete && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDocToDelete(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-slate-900 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center border border-white/10"
            >
              <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-white mb-2 tracking-tight">Excluir Documento?</h3>
              <p className="text-slate-400 mb-8 font-medium">Esta ação não pode ser desfeita. O documento será removido permanentemente.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDocToDelete(null)}
                  className="py-3 px-4 bg-white/5 text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteDocument(docToDelete)}
                  className="py-3 px-4 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10 mt-20"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                    {selectedTemplate ? <selectedTemplate.icon size={20} /> : <FileText size={20} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">
                      {selectedTemplate ? `Novo ${selectedTemplate.name}` : 'Novo Documento'}
                    </h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Preencha os dados e use a IA para gerar o conteúdo</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Paciente</label>
                      <input 
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail do Paciente</label>
                      <input 
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="paciente@email.com"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Informações Adicionais (Opcional)</label>
                    <textarea 
                      rows={4}
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder="Ex: Motivo do atestado, detalhes do contrato, etc."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white resize-none"
                    />
                  </div>
                  <button 
                    onClick={generateWithAI}
                    disabled={generating || !patientName}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        GERANDO DOCUMENTO...
                      </>
                    ) : (
                      <>
                        <Wand2 size={20} />
                        GERAR COM INTELIGÊNCIA ARTIFICIAL
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-white/5 rounded-3xl border border-white/10 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pré-visualização</span>
                    {generatedContent && (
                      <span className="text-xs text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={14} /> Pronto para salvar
                      </span>
                    )}
                  </div>
                  <div className="flex-1 bg-white rounded-2xl p-8 overflow-y-auto prose prose-slate prose-sm max-w-none shadow-inner">
                    {generatedContent ? (
                      <ReactMarkdown>{generatedContent}</ReactMarkdown>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
                        <FileText size={48} className="opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest">O conteúdo gerado aparecerá aqui.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveDocument}
                  disabled={!generatedContent}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SALVAR DOCUMENTO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {viewingDoc && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingDoc(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10 mt-20"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">{viewingDoc.type}</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Paciente: {viewingDoc.patient_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const printContent = document.getElementById('view-content');
                      const windowUrl = 'about:blank';
                      const uniqueName = new Date();
                      const windowName = 'Print' + uniqueName.getTime();
                      const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');
                      if (printWindow && printContent) {
                        printWindow.document.write(printContent.innerHTML);
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                      }
                    }}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                    title="Imprimir"
                  >
                    <Printer size={20} />
                  </button>
                  <button 
                    onClick={() => exportToPDF('view-content', `${viewingDoc.type}-${viewingDoc.patient_name}`)}
                    className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors border border-transparent hover:border-emerald-500/20"
                    title="Baixar PDF"
                  >
                    <Download size={20} />
                  </button>
                  <button 
                    onClick={() => setViewingDoc(null)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12">
                <div id="view-content" className="bg-white p-12 border border-slate-100 shadow-2xl rounded-lg prose prose-slate max-w-none text-black">
                  <h1 className="text-center mb-8 font-black">{viewingDoc.type}</h1>
                  <p className="mb-8 font-bold">Paciente: {viewingDoc.patient_name}</p>
                  <ReactMarkdown>{viewingDoc.content}</ReactMarkdown>
                  <div className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Documento gerado via FisioCareHub em {new Date(viewingDoc.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ProGuard>
  );
}
