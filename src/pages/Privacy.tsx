import { motion } from 'motion/react';
import { Shield, Lock, Eye, Database } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-bg-general py-12 md:py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12 rounded-[2.5rem] border border-white/10"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-black text-text-main tracking-tight">
                Política de Privacidade
              </h1>
              <p className="text-text-muted font-medium">Última atualização: 15 de Abril de 2026</p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8 text-text-muted leading-relaxed">
            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <Lock size={18} className="text-emerald-500" />
                1. Coleta de Informações
              </h2>
              <p>
                Coletamos informações que você nos fornece diretamente ao criar uma conta, como nome, e-mail, telefone, CREFITO (para profissionais) e dados de saúde (para pacientes, conforme inserido por eles ou seus profissionais).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <Eye size={18} className="text-emerald-500" />
                2. Uso das Informações
              </h2>
              <p>
                Utilizamos seus dados para fornecer, manter e melhorar nossos serviços, processar transações, enviar comunicações importantes e garantir a segurança da plataforma. Dados de saúde são tratados com sigilo absoluto e acessados apenas por profissionais autorizados pelo paciente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <Database size={18} className="text-emerald-500" />
                3. Armazenamento e Segurança
              </h2>
              <p>
                Utilizamos tecnologias de ponta e criptografia para proteger seus dados. As informações são armazenadas em servidores seguros e seguimos as diretrizes da LGPD (Lei Geral de Proteção de Dados) para garantir a privacidade dos usuários brasileiros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield size={18} className="text-emerald-500" />
                4. Compartilhamento de Dados
              </h2>
              <p>
                Não vendemos seus dados pessoais a terceiros. O compartilhamento ocorre apenas quando necessário para a prestação do serviço (ex: entre paciente e seu fisioterapeuta) ou por exigência legal.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <Lock size={18} className="text-emerald-500" />
                5. Seus Direitos
              </h2>
              <p>
                Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das configurações de perfil ou entrando em contato com nosso suporte.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
                <Eye size={18} className="text-emerald-500" />
                6. Cookies
              </h2>
              <p>
                Utilizamos cookies para melhorar sua experiência de navegação e entender como você utiliza nossa plataforma. Você pode gerenciar as preferências de cookies em seu navegador.
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
