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
        admin: 'Painel Admin'
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
        spanish: 'Espanhol'
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
        admin: 'Admin Panel'
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
        spanish: 'Spanish'
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
        admin: 'Panel Admin'
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
        spanish: 'Español'
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
