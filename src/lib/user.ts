import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function getUserName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data().name || 'Usuário';
    }
    return 'Usuário';
  } catch (err) {
    console.error("Erro ao buscar nome do usuário:", err);
    return 'Usuário';
  }
}
