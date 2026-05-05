import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  pt: {
    translation: {
      nav: {
        home: 'Início',
        appointments: 'Agenda',
        agenda: 'Agenda',
        patients: 'Pacientes',
        exercises: 'Exercícios',
        documents: 'Documentos',
        chat: 'Chat',
        records: 'Prontuários',
        triage: 'Triagem IA',
        profile: 'Perfil',
        login: 'Entrar',
        register: 'Cadastrar',
        logout: 'Sair',
        admin: 'Painel Admin',
        subscription: 'Assinatura',
        about: 'Sobre nós',
        library: 'Biblioteca',
        find_physio: 'Buscar Fisio',
        triages: 'Triagens',
        pain_diary: 'Diário de Dor',
        workouts: 'Treinos'
      },
      home: {
        hero: {
          title1: 'Sua reabilitação no',
          title2: 'conforto de casa',
          subtitle: 'Transformando a fisioterapia através da tecnologia e do cuidado humanizado para todas as idades.'
        }
      },
      settings: {
        title: 'Configurações',
        language: 'Idioma',
        language_description: 'Escolha o idioma do sistema',
        portuguese: 'Português',
        english: 'Inglês',
        spanish: 'Espanhol',
        preferences: 'Preferências'
      },
      clinic: {
        clinic_data: 'Dados da Clínica'
      },
      security: {
        title: 'Segurança'
      },
      notifications: {
        title: 'Notificações'
      },
      payments: {
        title: 'Pagamentos',
        received: 'Pagamentos Recebidos'
      },
      privacy: {
        title: 'Privacidade'
      }
    }
  },
  en: {
    translation: {
      nav: {
        home: 'Home',
        appointments: 'Schedule',
        agenda: 'Schedule',
        patients: 'Patients',
        exercises: 'Exercises',
        documents: 'Documents',
        chat: 'Chat',
        records: 'Medical Records',
        triage: 'AI Triage',
        profile: 'Profile',
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
        admin: 'Admin Panel',
        subscription: 'Subscription',
        about: 'About Us',
        library: 'Library',
        find_physio: 'Find Physio',
        triages: 'Triages',
        pain_diary: 'Pain Diary',
        workouts: 'Workouts'
      },
      home: {
        hero: {
          title1: 'Your rehabilitation in the',
          title2: 'comfort of home',
          subtitle: 'Transforming physiotherapy through technology and humanized care for all ages.'
        }
      },
      settings: {
        title: 'Settings',
        language: 'Language',
        language_description: 'Choose the system language',
        portuguese: 'Portuguese',
        english: 'English',
        spanish: 'Spanish',
        preferences: 'Preferences'
      },
      clinic: {
        clinic_data: 'Clinic Data'
      },
      security: {
        title: 'Security'
      },
      notifications: {
        title: 'Notifications'
      },
      payments: {
        title: 'Payments',
        received: 'Received Payments'
      },
      privacy: {
        title: 'Privacy'
      }
    }
  },
  es: {
    translation: {
      nav: {
        home: 'Inicio',
        appointments: 'Agenda',
        agenda: 'Agenda',
        patients: 'Pacientes',
        exercises: 'Ejercicios',
        documents: 'Documentos',
        chat: 'Chat',
        records: 'Historias Clínicas',
        triage: 'Triaje IA',
        profile: 'Perfil',
        login: 'Entrar',
        register: 'Registrarse',
        logout: 'Salir',
        admin: 'Panel Admin',
        subscription: 'Suscripción',
        about: 'Sobre nosotros',
        library: 'Biblioteca',
        find_physio: 'Buscar Fisio',
        triages: 'Triajes',
        pain_diary: 'Diario de Dolor',
        workouts: 'Entrenamientos'
      },
      home: {
        hero: {
          title1: 'Su rehabilitación en la',
          title2: 'comodidad de su hogar',
          subtitle: 'Transformando la fisioterapia a través de la tecnología y el cuidado humanizado para todas las edades.'
        }
      },
      settings: {
        title: 'Configuraciones',
        language: 'Idioma',
        language_description: 'Elija el idioma del sistema',
        portuguese: 'Portugués',
        english: 'Inglés',
        spanish: 'Español',
        preferences: 'Preferencias'
      },
      clinic: {
        clinic_data: 'Datos de la Clínica'
      },
      security: {
        title: 'Seguridad'
      },
      notifications: {
        title: 'Notificaciones'
      },
      payments: {
        title: 'Pagos',
        received: 'Pagos Recibidos'
      },
      privacy: {
        title: 'Privacidad'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
