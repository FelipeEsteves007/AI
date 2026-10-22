/**
 * Seed de DEMONSTRAÇÃO — dados fictícios para prévia e testes manuais.
 *
 * Cria usuários de demonstração, 6 cursos e 3.000 alunos (o volume real do projeto), com
 * compras, oportunidades e tarefas. Serve também para medir a listagem com volume real.
 *
 * Segurança:
 * - Recusa rodar com NODE_ENV=production.
 * - Só mexe no que ele mesmo cria: usuários `@demo.crm.test`, alunos `@exemplo.test` e cursos
 *   marcados com `[demo]` na descrição. Usuários reais do banco nunca são tocados.
 * - Idempotente: apaga os próprios dados antes de recriar. Os filhos dos alunos (compras,
 *   oportunidades, tarefas) saem pela cascata do schema.
 * - Determinístico: gerador pseudoaleatório com semente fixa, então rodar de novo gera os
 *   mesmos alunos.
 *
 * Utilitário de linha de comando: escreve em `process.stdout`, nunca `console.log`.
 *
 * Uso: npm run db:seed-demo
 */

import { LeadStatus, PrismaClient, StudentStatus, TaskPriority, UserRole } from '@prisma/client';

import { hashPassword } from '../../utils/password';

const TOTAL_ALUNOS = 3000;
const SENHA_DEMO = 'Demo@12345';
const DOMINIO_USUARIOS = '@demo.crm.test';
const DOMINIO_ALUNOS = '@exemplo.test';
const MARCA_CURSO = '[demo]';

const out = (msg: string) => process.stdout.write(`${msg}\n`);

// ---------------------------------------------------------------------------------------------
// Gerador pseudoaleatório com semente (mulberry32) — mesmos dados a cada execução.
let semente = 20260912;
function aleatorio(): number {
  semente |= 0;
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const escolher = <T>(lista: readonly T[]): T => lista[Math.floor(aleatorio() * lista.length)];
const entre = (min: number, max: number) => min + Math.floor(aleatorio() * (max - min + 1));
const DIA = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------------------------
// Nomes com acento de propósito: exercitam a busca sem diferenciar maiúsculas (JOÃO → joão).
const PRIMEIROS = [
  'João', 'Maria', 'José', 'Ana', 'Antônio', 'Francisca', 'Carlos', 'Adriana', 'Paulo', 'Juliana',
  'Pedro', 'Márcia', 'Lucas', 'Fernanda', 'Luiz', 'Patrícia', 'Marcos', 'Aline', 'Gabriel', 'Sandra',
  'Rafael', 'Camila', 'Daniel', 'Amanda', 'Marcelo', 'Bruna', 'Bruno', 'Letícia', 'Eduardo', 'Júlia',
  'Felipe', 'Beatriz', 'Rodrigo', 'Larissa', 'Gustavo', 'Vitória', 'Thiago', 'Conceição', 'André', 'Débora',
] as const;
const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
  'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
  'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas',
  'Cardoso', 'Ramos', 'Gonçalves', 'Santana', 'Teixeira', 'Araújo', 'Conceição', 'Pinto', 'Brandão', 'Simões',
] as const;
const DDDS = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '19'] as const;
const NOTAS = [
  'Interessado em IA aplicada a negócios.',
  'Pediu condição especial para a turma de novembro.',
  'Prefere contato por e-mail, à tarde.',
  'Já fez o curso gratuito; bom potencial para o avançado.',
  'Indicado por outro aluno.',
  'Reclamou do acesso à plataforma — resolvido.',
] as const;

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** CPF válido (dígitos verificadores corretos) a partir de uma base de 9 dígitos. */
function gerarCpf(base: number): string {
  const d = String(base).padStart(9, '0').split('').map(Number);
  // evita sequência repetida (000000000, 111111111...), que a validação recusa
  if (d.every((x) => x === d[0])) d[8] = (d[8] + 1) % 10;
  const digito = (nums: number[]) => {
    const soma = nums.reduce((acc, n, i) => acc + n * (nums.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(d);
  const d2 = digito([...d, d1]);
  return [...d, d1, d2].join('');
}

// ---------------------------------------------------------------------------------------------

function garantirAmbiente() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed de demonstração recusado: NODE_ENV=production.');
  }
  const url = process.env.DATABASE_URL ?? '';
  const banco = url.split('/').pop()?.split('?')[0] ?? '';
  if (!banco) throw new Error('DATABASE_URL ausente — rode via npm run db:seed-demo.');
  return banco;
}

async function limpar(prisma: PrismaClient) {
  const usuariosDemo = await prisma.user.findMany({
    where: { email: { endsWith: DOMINIO_USUARIOS } },
    select: { id: true },
  });
  const ids = usuariosDemo.map((u) => u.id);

  // Alunos demo levam compras, leads e tarefas pela cascata do schema.
  const alunos = await prisma.student.deleteMany({ where: { email: { endsWith: DOMINIO_ALUNOS } } });
  // Leads e tarefas dos usuários demo que ainda sobrarem (em alunos que não são demo) bloqueiam
  // a exclusão do usuário (onDelete: Restrict) — saem antes.
  await prisma.pipelineLead.deleteMany({ where: { assignedTo: { in: ids } } });
  await prisma.task.deleteMany({ where: { assignedTo: { in: ids } } });
  await prisma.course.deleteMany({ where: { description: { startsWith: MARCA_CURSO } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  const usuarios = await prisma.user.deleteMany({ where: { id: { in: ids } } });

  return { alunos: alunos.count, usuarios: usuarios.count };
}

async function main() {
  const banco = garantirAmbiente();
  const prisma = new PrismaClient();
  const inicio = Date.now();

  try {
    out(`Banco: ${banco}`);
    const removidos = await limpar(prisma);
    out(`Limpeza: ${removidos.alunos} alunos e ${removidos.usuarios} usuários de demonstração removidos`);

    // --- Usuários ------------------------------------------------------------------------------
    const passwordHash = await hashPassword(SENHA_DEMO);
    const base = { passwordHash, mustChangePassword: false };
    const [ceo, ana, bruno, camila, diego] = await Promise.all([
      prisma.user.create({ data: { ...base, name: 'Carla Mendes', email: `ceo${DOMINIO_USUARIOS}`, role: UserRole.ceo } }),
      prisma.user.create({ data: { ...base, name: 'Ana Souza', email: `ana${DOMINIO_USUARIOS}`, role: UserRole.vendedor } }),
      prisma.user.create({ data: { ...base, name: 'Bruno Lima', email: `bruno${DOMINIO_USUARIOS}`, role: UserRole.vendedor } }),
      prisma.user.create({ data: { ...base, name: 'Camila Rocha', email: `camila${DOMINIO_USUARIOS}`, role: UserRole.vendedor } }),
      // Desativado: exercita a S6-10 (não aceita atribuição nova a usuário inativo).
      prisma.user.create({ data: { ...base, name: 'Diego Alves', email: `diego${DOMINIO_USUARIOS}`, role: UserRole.vendedor, isActive: false } }),
    ]);
    const admin = await prisma.user.create({
      data: { ...base, name: 'Admin Demonstração', email: `admin${DOMINIO_USUARIOS}`, role: UserRole.admin },
    });
    const vendedoresAtivos = [ana, bruno, camila];

    // --- Cursos --------------------------------------------------------------------------------
    const cursosBase = [
      { name: 'Imersão em IA', price: 297 },
      { name: 'Claude Code na Prática', price: 497 },
      { name: 'Delphi Moderno', price: 397 },
      { name: 'Agentes de IA para Negócios', price: 697 },
      { name: 'Automação com n8n', price: 247 },
      { name: 'Mentoria Avançada', price: 1997 },
    ];
    const cursos = await Promise.all(
      cursosBase.map((c, i) =>
        prisma.course.create({
          data: { name: c.name, price: c.price, description: `${MARCA_CURSO} Curso fictício ${i + 1}`, isActive: i !== 4 },
        }),
      ),
    );

    // --- Alunos --------------------------------------------------------------------------------
    const agora = Date.now();
    const alunos = Array.from({ length: TOTAL_ALUNOS }, (_, i) => {
      const primeiro = escolher(PRIMEIROS);
      const sobrenome = escolher(SOBRENOMES);
      const r = aleatorio();
      const status = r < 0.7 ? StudentStatus.ativo : r < 0.9 ? StudentStatus.inativo : StudentStatus.pausado;
      const d = aleatorio();
      // 90% dos 3 vendedores ativos, 4% do desativado, 6% sem responsável
      const assignedTo = d < 0.9 ? vendedoresAtivos[i % 3].id : d < 0.94 ? diego.id : null;
      const criadoEm = new Date(agora - entre(0, 540) * DIA - entre(0, 86_000) * 1000);
      return {
        name: `${primeiro} ${sobrenome}`,
        email: `${semAcento(primeiro)}.${semAcento(sobrenome)}.${i + 1}${DOMINIO_ALUNOS}`,
        phone: aleatorio() < 0.85 ? `+55 ${escolher(DDDS)} 9${entre(1000, 9999)}-${entre(1000, 9999)}` : null,
        cpf: aleatorio() < 0.8 ? gerarCpf(100_000_000 + i * 7919) : null,
        status,
        notes: aleatorio() < 0.25 ? escolher(NOTAS) : null,
        lastContactDate: aleatorio() < 0.5 ? new Date(criadoEm.getTime() + entre(1, 60) * DIA) : null,
        assignedTo,
        createdAt: criadoEm,
      };
    });

    for (let i = 0; i < alunos.length; i += 500) {
      await prisma.student.createMany({ data: alunos.slice(i, i + 500) });
    }
    const gravados = await prisma.student.findMany({
      where: { email: { endsWith: DOMINIO_ALUNOS } },
      select: { id: true, assignedTo: true, createdAt: true },
    });
    out(`Alunos: ${gravados.length}`);

    // --- Compras (compra única por aluno+curso; data nunca futura) ------------------------------
    const compras: { studentId: string; courseId: string; purchaseDate: Date; amount: number }[] = [];
    for (const aluno of gravados) {
      if (aleatorio() > 0.6) continue;
      const qtd = aleatorio() < 0.75 ? 1 : 2;
      const escolhidos = new Set<number>();
      while (escolhidos.size < qtd) escolhidos.add(entre(0, cursos.length - 1));
      for (const idx of escolhidos) {
        const desde = aluno.createdAt.getTime();
        const data = new Date(Math.min(agora - DIA, desde + entre(0, 120) * DIA));
        const preco = cursosBase[idx].price;
        compras.push({
          studentId: aluno.id,
          courseId: cursos[idx].id,
          purchaseDate: new Date(data.toISOString().slice(0, 10)),
          amount: aleatorio() < 0.2 ? Math.round(preco * 0.8) : preco, // 20% com desconto
        });
      }
    }
    for (let i = 0; i < compras.length; i += 1000) {
      await prisma.purchase.createMany({ data: compras.slice(i, i + 1000) });
    }
    out(`Compras: ${compras.length}`);

    // --- Oportunidades -------------------------------------------------------------------------
    const statusLead = [LeadStatus.prospecting, LeadStatus.negotiation, LeadStatus.sold, LeadStatus.lost];
    const leads = gravados
      .filter((a) => a.assignedTo && a.assignedTo !== diego.id && aleatorio() < 0.15)
      .map((a) => {
        const status = escolher(statusLead);
        // ~10% dos leads ficam com OUTRO vendedor: exercita a S6-9 (vendedor não vê lead alheio)
        const outro = aleatorio() < 0.1;
        const responsavel = outro ? vendedoresAtivos.find((v) => v.id !== a.assignedTo)! : vendedoresAtivos.find((v) => v.id === a.assignedTo)!;
        return {
          studentId: a.id,
          assignedTo: responsavel.id,
          status,
          value: aleatorio() < 0.85 ? entre(2, 20) * 50 : null,
          lostReason: status === LeadStatus.lost ? escolher(['Preço', 'Sem tempo agora', 'Escolheu concorrente']) : null,
        };
      });
    await prisma.pipelineLead.createMany({ data: leads });
    out(`Oportunidades: ${leads.length}`);

    // --- Tarefas -------------------------------------------------------------------------------
    const titulos = ['Ligar para retomar contato', 'Enviar proposta', 'Confirmar pagamento', 'Follow-up pós-curso', 'Agendar call de onboarding'];
    const prioridades = [TaskPriority.low, TaskPriority.normal, TaskPriority.high];
    const tarefas = gravados
      .filter((a) => a.assignedTo && a.assignedTo !== diego.id && aleatorio() < 0.1)
      .map((a) => {
        const vencimento = new Date(agora + entre(-15, 30) * DIA);
        const concluida = vencimento.getTime() < agora && aleatorio() < 0.6;
        return {
          title: escolher(titulos),
          assignedTo: a.assignedTo!,
          relatedTo: a.id,
          relatedType: 'student',
          priority: escolher(prioridades),
          dueDate: vencimento,
          completedAt: concluida ? new Date(vencimento.getTime() - DIA) : null,
        };
      });
    await prisma.task.createMany({ data: tarefas });
    out(`Tarefas: ${tarefas.length}`);

    // --- Resumo --------------------------------------------------------------------------------
    const porVendedor = await prisma.student.groupBy({
      by: ['assignedTo'],
      where: { email: { endsWith: DOMINIO_ALUNOS } },
      _count: true,
    });
    const nomes = new Map([ana, bruno, camila, diego].map((u) => [u.id, u.name]));
    out('');
    out('Alunos por responsável:');
    for (const g of porVendedor) out(`  ${nomes.get(g.assignedTo ?? '') ?? '(sem responsável)'}: ${g._count}`);
    out('');
    out(`Logins de demonstração — senha para todos: ${SENHA_DEMO}`);
    for (const u of [admin, ceo, ana, bruno, camila]) out(`  ${u.role.padEnd(8)} ${u.email}`);
    out(`  (desativado) ${diego.email}`);
    out('');
    out(`Concluído em ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro: unknown) => {
  process.stderr.write(`Seed de demonstração falhou: ${erro instanceof Error ? erro.message : String(erro)}\n`);
  process.exit(1);
});
