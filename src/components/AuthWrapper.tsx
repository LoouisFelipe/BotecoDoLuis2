import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, AuthError } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AuthWrapperProps {
  children: (user: UserProfile) => React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Use getDoc which handles offline/cache better than getDocFromServer
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User Profile Loaded:", { uid: firebaseUser.uid, email: firebaseUser.email, role: userData.role });
            setUser({ uid: firebaseUser.uid, ...userData } as UserProfile);
          } else {
            // Create new user profile
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName,
              role: firebaseUser.email === 'louisfelipecabral@gmail.com' ? 'admin' : 'staff',
              createdAt: serverTimestamp(),
            };
            console.log("Creating New User Profile:", newUser);
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.error('Auth state change error:', err);
        if (err.message?.includes('offline')) {
          setError('O sistema está offline. Verifique sua conexão ou se o banco de dados está ativo.');
        } else {
          setError('Erro ao carregar perfil do usuário. Verifique o Console do Firebase.');
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      const authError = err as AuthError;
      console.error('Login failed:', authError);
      
      let message = 'Ocorreu um erro ao tentar fazer login.';
      
      if (authError.code === 'auth/unauthorized-domain') {
        message = 'Este domínio não está autorizado no Firebase Console. Por favor, adicione "botecodoluis2--botecodoluis2.us-central1.hosted.app" aos domínios autorizados.';
      } else if (authError.code === 'auth/popup-blocked') {
        message = 'O popup de login foi bloqueado pelo navegador.';
      } else if (authError.code === 'auth/popup-closed-by-user') {
        message = 'O login foi cancelado.';
      }
      
      setError(message);
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full shadow-xl border-none">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
              <Lock className="text-primary w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Bar Admin Pro</CardTitle>
            <CardDescription>
              Sign in to manage your bar operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-red-600 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <Button onClick={handleLogin} className="w-full py-6 text-lg font-medium" size="lg">
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children(user)}</>;
}
