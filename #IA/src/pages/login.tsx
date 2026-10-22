import Head from 'next/head';

import { LoginForm } from '@/components/Auth/LoginForm';

export default function LoginPage(): JSX.Element {
  return (
    <>
      <Head>
        <title>Entrar — CRM de Alunos</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">CRM de Alunos</h1>
            <p className="mt-1 text-sm text-gray-500">Gestão de alunos e vendas</p>
          </div>
          <LoginForm />
        </div>
      </main>
    </>
  );
}
