/**
 * Massa de teste do E2E, criada pelo `globalSetup.ts` a cada execução de `npm run e2e`.
 *
 * Cada cenário sensível a estado tem o **seu** usuário: o bloqueio por tentativas (RN-07) conta
 * falhas por e-mail, e a troca de senha provisória (RN-05) queima a senha inicial. Usuários
 * separados mantêm os specs independentes entre si e da ordem de execução.
 */

export type E2ERole = 'admin' | 'ceo' | 'vendedor';

export interface E2EUser {
  name: string;
  email: string;
  /** Senha em texto puro, só existe aqui e no `globalSetup` (o banco guarda o hash — RN-13). */
  password: string;
  role: E2ERole;
  /** `true` = entra com senha provisória e é obrigado a trocá-la no primeiro acesso. */
  mustChangePassword: boolean;
}

/** Único admin da massa: é o que torna determinística a proteção do último admin (RN-12). */
export const adminUser: E2EUser = {
  name: 'Adriano Admin',
  email: 'admin@e2e.test',
  password: 'AdminE2E!2026',
  role: 'admin',
  mustChangePassword: false,
};

export const ceoUser: E2EUser = {
  name: 'Carla CEO',
  email: 'ceo@e2e.test',
  password: 'CeoE2E!2026',
  role: 'ceo',
  mustChangePassword: false,
};

export const vendedorUser: E2EUser = {
  name: 'Vitor Vendedor',
  email: 'vendedor@e2e.test',
  password: 'VendedorE2E!2026',
  role: 'vendedor',
  mustChangePassword: false,
};

/**
 * Segunda vendedora, só para o RBAC de alunos (Sprint 6): dona dos alunos que o `vendedorUser`
 * não pode ver nem abrir por URL.
 */
export const otherVendedorUser: E2EUser = {
  name: 'Olga Outra Vendedora',
  email: 'outra-vendedora@e2e.test',
  password: 'OutraVendedoraE2E!2026',
  role: 'vendedor',
  mustChangePassword: false,
};

/** Só para o fluxo de senha provisória (CU-04): a senha abaixo é queimada na troca. */
export const provisionalUser: E2EUser = {
  name: 'Paula Provisória',
  email: 'provisoria@e2e.test',
  password: 'ProvisoriaE2E!2026',
  role: 'vendedor',
  mustChangePassword: true,
};

/** Só para o bloqueio por tentativas (CU-03): acumula falhas de login sem afetar os demais. */
export const lockoutUser: E2EUser = {
  name: 'Bruno Bloqueio',
  email: 'bloqueio@e2e.test',
  password: 'BloqueioE2E!2026',
  role: 'vendedor',
  mustChangePassword: false,
};

/** Só para a mensagem genérica de credencial errada (CU-02), pelo mesmo motivo do anterior. */
export const wrongPasswordUser: E2EUser = {
  name: 'Selma Senha Errada',
  email: 'senha-errada@e2e.test',
  password: 'SenhaErradaE2E!2026',
  role: 'vendedor',
  mustChangePassword: false,
};

/** Tudo que o `globalSetup` insere no banco de teste. */
export const e2eUsers: readonly E2EUser[] = [
  adminUser,
  ceoUser,
  vendedorUser,
  otherVendedorUser,
  provisionalUser,
  lockoutUser,
  wrongPasswordUser,
];

/** E-mail que não existe na massa — serve para provar a mensagem genérica de login (RN-06). */
export const unknownEmail = 'ninguem@e2e.test';
