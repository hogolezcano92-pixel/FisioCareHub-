# FisioCareHub - Oportunidades Fase 2

Esta fase adiciona o lado do paciente:

- `src/pages/PatientOpportunityRequests.tsx`
- rota `/patient/requests`
- item "Solicitar atendimento" no menu do paciente

Ordem:

1. Rode primeiro o SQL da fase 1: `sql/001_opportunities.sql`
2. Substitua/adicone os arquivos deste pacote
3. Rode `npm run build`
4. Teste:
   - Paciente publica uma solicitação em `/patient/requests`
   - Fisioterapeuta Pro vê em `/opportunities`
   - Fisioterapeuta Pro envia interesse
   - Paciente recebe notificação e conversa pelo chat interno

Regra de negócio preservada:

- Não libera telefone, WhatsApp, e-mail nem endereço completo
- Interesse abre caminho para chat interno
- Agendamento e pagamento continuam dentro do FisioCareHub
- Comissão de 12% continua protegida
