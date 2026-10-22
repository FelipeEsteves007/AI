import Head from 'next/head';

import { ChangePasswordForm } from '@/components/Auth/ChangePasswordForm';
import { useAuth } from '@/context/AuthContext';

export default function ChangePasswordPage(): JSX.Element {
  const { user } = useAuth();
  const isProvisional = user?.mustChangePassword === true;

  return (
    <>
      <Head>
        <title>Trocar senha — CRM de Alunos</title>
      </Head>
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900">Trocar senha</h1>
        {isProvisional ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Sua senha é provisória. Defina uma nova senha para continuar usando o sistema.
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            Ao trocar a senha, as outras sessões abertas são encerradas.
          </p>
        )}
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </div>
    </>
  );
}
