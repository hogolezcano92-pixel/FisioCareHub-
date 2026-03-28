import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, getDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Gatekeeper } from '../components/Gatekeeper';
import { useSubscription } from '../hooks/useSubscription';
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
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import { createRoot } from 'react-dom/client';

const FAVORITE_TEMPLATES = [
  { id: 'contrato', name: 'Contrato de Prestação', icon: FileSignature, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'atestado', name: 'Atestado de Comparecimento', icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'autorizacao', name: 'Autorização de Imagem', icon: ClipboardCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'laudo', name: 'Laudo/Relatório', icon: FileSearch, color: 'text-purple-600', bg: 'bg-purple-50' },
];

export default function Documents() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
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

  const { isPro } = useSubscription();

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          fetchDocuments(data);
        }
      });
    }
  }, [user]);

  const fetchDocuments = async (currentUserData: any) => {
    try {
      const q = query(
        collection(db, 'documents'),
        where(currentUserData.role === 'physiotherapist' ? 'physioId' : 'patientEmail', '==', currentUserData.role === 'physiotherapist' ? user?.uid : user?.email),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setDocuments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Erro ao buscar documentos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = (template?: any) => {
    setSelectedTemplate(template || null);
    setGeneratedContent('');
    setPatientName('');
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
      const getGeminiKey = () => {
        try {
          if (!process.env.GEMINI_API_KEY) {
            console.warn("Atenção: GEMINI_API_KEY não encontrada no ambiente.");
          }
          return process.env.GEMINI_API_KEY || "";
        } catch (e) {
          return "";
        }
      };
      const ai = new GoogleGenAI({ apiKey: getGeminiKey() });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Você é um assistente administrativo para fisioterapeutas. 
        Gere um documento do tipo "${selectedTemplate?.name || 'Documento Geral'}" para o paciente "${patientName}".
        Informações adicionais: ${additionalInfo}
        O documento deve ser profissional, formal e seguir as normas brasileiras de saúde.
        Use Markdown para formatação.`,
      });

      const response = await model;
      setGeneratedContent(response.text || '');
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
      const docRef = await addDoc(collection(db, 'documents'), {
        physioId: user?.uid,
        physioName: userData.name,
        patientName,
        patientEmail: patientEmail.trim().toLowerCase(),
        type: selectedTemplate?.name || 'Documento Geral',
        content: generatedContent,
        createdAt: serverTimestamp(),
      });

      setDocuments([{
        id: docRef.id,
        physioName: userData.name,
        patientName,
        patientEmail: patientEmail.trim().toLowerCase(),
        type: selectedTemplate?.name || 'Documento Geral',
        content: generatedContent,
        createdAt: new Date(),
      }, ...documents]);

      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar documento:", err);
      import('sonner').then(({ toast }) => toast.error("Erro ao salvar documento."));
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'documents', id));
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
      // Ensure images are loaded and fonts are ready
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
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      // Handle multi-page if content is too long
      let heightLeft = imgHeight;
      let position = 10; // 10mm top margin

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
        <p style={{ marginBottom: '20px' }}><strong>Paciente:</strong> {doc.patientName}</p>
        <ReactMarkdown>{doc.content}</ReactMarkdown>
        <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          Documento gerado via FisioCareHub em {doc.createdAt?.toDate ? doc.createdAt.toDate().toLocaleDateString() : new Date(doc.createdAt).toLocaleDateString()}
        </div>
      </div>
    );

    // Wait for render
    setTimeout(async () => {
      await exportToPDF(tempDiv.id, `${doc.type}-${doc.patientName}`);
      document.body.removeChild(tempDiv);
    }, 500);
  };

  const isPhysio = userData?.role === 'physiotherapist';

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Documentos e Relatórios</h1>
          <p className="text-slate-500">
            {isPhysio 
              ? 'Gerencie sua papelada de forma rápida e automática.' 
              : 'Visualize e baixe seus documentos e relatórios médicos.'}
          </p>
        </div>
        {isPhysio && (
          <Gatekeeper featureId="ai-documents">
            <button 
              onClick={() => handleCreateNew()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
            >
              <Plus size={20} /> CRIAR NOVO DOCUMENTO
            </button>
          </Gatekeeper>
        )}
      </header>

      {/* Favorites Section - Only for Physio */}
      {isPhysio && (
        <Gatekeeper featureId="ai-documents">
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Star className="text-amber-500 fill-amber-500" size={20} />
              <h2 className="text-xl font-bold text-slate-900">FAVORITOS</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FAVORITE_TEMPLATES.map((template) => (
                <motion.div
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-4 group relative overflow-hidden"
                >
                  <div className={`w-12 h-12 ${template.bg} ${template.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <template.icon size={24} />
                  </div>
                  <div className="flex-1 cursor-pointer" onClick={() => handleCreateNew(template)}>
                    <h3 className="font-bold text-slate-900 leading-tight">{template.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Clique para iniciar</p>
                  </div>
                  <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="Remover dos favoritos">
                      <X size={14} />
                    </button>
                    <div className="p-1.5 text-slate-300">
                      <FileText size={14} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </Gatekeeper>
      )}

      {/* Recent Documents */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Library size={20} className="text-blue-600" />
            BIBLIOTECA DE DOCUMENTOS
          </h2>
          <button className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
            VER BIBLIOTECA COMPLETA <ChevronRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">Documento</th>
                <th className="px-6 py-4 font-bold">{isPhysio ? 'Paciente' : 'Fisioterapeuta'}</th>
                <th className="px-6 py-4 font-bold">Data</th>
                <th className="px-6 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Nenhum documento encontrado.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                          <FileText size={16} />
                        </div>
                        <span className="font-bold text-slate-900">{doc.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{isPhysio ? doc.patientName : (doc.physioName || 'Fisioterapeuta')}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {doc.createdAt?.toDate ? doc.createdAt.toDate().toLocaleDateString() : new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setViewingDoc(doc)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleExportFromTable(doc)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Baixar PDF"
                        >
                          <Download size={18} />
                        </button>
                        {isPhysio && (
                          <button 
                            onClick={() => setDocToDelete(doc.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDocToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Documento?</h3>
              <p className="text-slate-500 mb-8">Esta ação não pode ser desfeita. O documento será removido permanentemente.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDocToDelete(null)}
                  className="py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteDocument(docToDelete)}
                  className="py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                    {selectedTemplate ? <selectedTemplate.icon size={20} /> : <FileText size={20} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedTemplate ? `Novo ${selectedTemplate.name}` : 'Novo Documento'}
                    </h2>
                    <p className="text-xs text-slate-500">Preencha os dados e use a IA para gerar o conteúdo</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Paciente</label>
                      <input 
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">E-mail do Paciente</label>
                      <input 
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="paciente@email.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Informações Adicionais (Opcional)</label>
                    <textarea 
                      rows={4}
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder="Ex: Motivo do atestado, detalhes do contrato, etc."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                    />
                  </div>
                  <button 
                    onClick={generateWithAI}
                    disabled={generating || !patientName}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
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

                <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pré-visualização</span>
                    {generatedContent && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} /> Pronto para salvar
                      </span>
                    )}
                  </div>
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 overflow-y-auto prose prose-slate prose-sm max-w-none">
                    {generatedContent ? (
                      <ReactMarkdown>{generatedContent}</ReactMarkdown>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
                        <FileText size={48} className="opacity-20" />
                        <p className="text-sm">O conteúdo gerado aparecerá aqui.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveDocument}
                  disabled={!generatedContent}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingDoc(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{viewingDoc.type}</h2>
                    <p className="text-xs text-slate-500">Paciente: {viewingDoc.patientName}</p>
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
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Imprimir"
                  >
                    <Printer size={20} />
                  </button>
                  <button 
                    onClick={() => exportToPDF('view-content', `${viewingDoc.type}-${viewingDoc.patientName}`)}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Baixar PDF"
                  >
                    <Download size={20} />
                  </button>
                  <button 
                    onClick={() => setViewingDoc(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12">
                <div id="view-content" className="bg-white p-8 border border-slate-100 shadow-sm rounded-lg prose prose-slate max-w-none">
                  <h1 className="text-center mb-8">{viewingDoc.type}</h1>
                  <p className="mb-8"><strong>Paciente:</strong> {viewingDoc.patientName}</p>
                  <ReactMarkdown>{viewingDoc.content}</ReactMarkdown>
                  <div className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-400">
                    Documento gerado via FisioCareHub em {viewingDoc.createdAt?.toDate ? viewingDoc.createdAt.toDate().toLocaleDateString() : new Date(viewingDoc.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
