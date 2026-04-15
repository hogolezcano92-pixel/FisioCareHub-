import { motion } from 'motion/react';
import { FileText, Shield, CheckCircle } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-bg-general py-12 md:py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12 rounded-[2.5rem] border border-white/10"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-black text-text-main tracking-tight">
                Termos de Uso
              </h1>
              <p className="text-text-muted font-medium">Última atualização: 15 de Abril de 2026</p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8 text-text-muted leading-relaxed">
            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-primary" />
                1. Aceitação dos Termos
              </h2>
              <p>
                Ao acessar e usar o FisioCareHub, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossa plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-primary" />
                2. Descrição do Serviço
              </h2>
              <p>
                O FisioCareHub é uma plataforma tecnológica que conecta fisioterapeutas e pacientes, oferecendo ferramentas de gestão, agendamento, prontuário eletrônico e exercícios terapêuticos. Não somos uma clínica de fisioterapia, mas sim um facilitador de conexões e gestão.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-primary" />
                3. Cadastro e Segurança
              </h2>
              <p>
                Para utilizar certas funcionalidades, você deve criar uma conta. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta. Fisioterapeutas devem fornecer informações verídicas sobre seu registro profissional (CREFITO).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-primary" />
                4. Responsabilidades do Profissional
              </h2>
              <p>
                O fisioterapeuta é o único responsável pelo diagnóstico, tratamento e orientações fornecidas ao paciente. A plataforma fornece ferramentas de apoio, mas não substitui o julgamento clínico profissional.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-primary" />
                5. Pagamentos e Assinaturas
              </h2>
              <p>
                Oferecemos planos gratuitos e premium. As assinaturas premium são renovadas automaticamente, a menos que canceladas pelo usuário. Os valores e condições estão detalhados na área de Assinatura do sistema.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-primary" />
                6. Propriedade Intelectual
              </h2>
              <p>
                Todo o conteúdo, design, logotipos e tecnologia do FisioCareHub são de propriedade exclusiva da nossa empresa e protegidos por leis de direitos autorais.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-primary" />
                7. Limitação de Responsabilidade
              </h2>
              <p>
                O FisioCareHub não se responsabiliza por danos indiretos, incidentais ou consequentes resultantes do uso ou incapacidade de usar a plataforma, ou por condutas de terceiros (pacientes ou profissionais).
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex justify-center">
            <button 
              onClick={() => window.history.back()}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-text-main rounded-full font-black transition-all"
            >
              Voltar
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
