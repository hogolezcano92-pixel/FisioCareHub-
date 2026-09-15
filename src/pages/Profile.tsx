import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { User, Mail, Camera, FileText, CheckCircle, Loader2, Upload, ShieldCheck, Settings, Trash2, Lock, Bell, Globe, AlertTriangle, Zap, ExternalLink, LogOut, CreditCard, Building2, DollarSign, Wallet, TrendingUp, Receipt, CalendarDays, ArrowDownToLine, Shield, Eye, Crown, Download, Palette } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { cn, resolveStorageUrl, formatCPF, validateCPF } from '../lib/utils';
import { getEffectivePlan, hasPlanAccess } from '../lib/planAccess';
import { THEMES } from '../lib/themes';
import { uploadDocument, uploadPhysioDocument, getPrivateDocumentUrl } from '../services/supabaseStorage';
import { logActivity } from '../services/activityService';
import { getSupabase, invokeFunction, supabase } from '../lib/supabase';
import AvatarUpload from '../components/AvatarUpload';
import PaymentMethods from '../components/PaymentMethods';
import PhysioPaymentData from '../components/PhysioPaymentData';
import PhysioWithdrawal from '../components/PhysioWithdrawal';
import ProfessionalCredentialCard from '../components/ProfessionalCredentialCard';
import FloatingHelpMenu from '../components/FloatingHelpMenu';
import { isBiometricsSupported, registerBiometrics } from '../lib/webauthn';
import { generateEmailHTML } from '../services/emailTemplate';

// NOTE: Full file content could not be safely reconstructed from the truncated GitHub response.
// No update was applied to avoid overwriting unrelated code.
