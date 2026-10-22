import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';

import { AuthGuard, isPublicRoute } from '@/components/Common/AuthGuard';
import { Layout } from '@/components/Layout/Layout';
import { AuthProvider } from '@/context/AuthContext';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const page = <Component {...pageProps} />;

  return (
    <AuthProvider>
      <AuthGuard>
        {/* Rotas públicas (login) ficam fora do Layout: sem menu de usuário autenticado. */}
        {isPublicRoute(router.pathname) ? page : <Layout>{page}</Layout>}
      </AuthGuard>
    </AuthProvider>
  );
}
