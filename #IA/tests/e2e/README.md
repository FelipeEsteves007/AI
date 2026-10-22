Testes end-to-end com Playwright (navegador, API e banco de verdade).

## Como rodar

```
npm run e2e                        # tudo
npm run e2e -- tests/e2e/auth.spec.ts   # um arquivo
```

O script carrega o `.env.test` (fora do git) com `dotenv-cli`. Esse arquivo aponta para o banco
`crm_alunos_test` e usa portas próprias — API em 3101 e Next em 3100 — para não atropelar o
ambiente de desenvolvimento (3000/3001) nem o banco `crm_alunos`.

O `playwright.config.ts` sobe os dois servidores sozinho. O Next roda com `--turbopack`: é
obrigatório enquanto a pasta do projeto tiver `#` no caminho (com webpack o app responde 500).

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `globalSetup.ts` | Trava de segurança do banco, `prisma migrate deploy`, `TRUNCATE` e criação da massa |
| `fixtures.ts` | Credenciais da massa de teste (um usuário por cenário sensível a estado) |
| `helpers.ts` | Login pela interface, troca de senha, localizadores de alerta e e-mail único |
| `health.spec.ts` | Os dois servidores no ar |
| `auth.spec.ts` | Login dos três papéis, credencial errada, guarda de rota, senha provisória, logout e bloqueio |
| `users.spec.ts` | Criação com senha provisória, RBAC de CEO e vendedor, desativação e último admin |
| `students.spec.ts` | Busca com debounce, detalhe e edição inline, e-mail duplicado e CPF inválido, RBAC do vendedor, 403 no DELETE para CEO e vendedor, exclusão pelo admin com auditoria `STUDENT_DELETED` |

## Cuidados

- O `globalSetup` **apaga** os dados do banco configurado; por isso ele recusa qualquer banco cujo
  nome não termine em `_test`.
- Um worker só: os specs dividem o mesmo banco. Ainda assim cada teste é independente — usa o
  usuário do seu cenário ou cria um com e-mail único.
- Nada de espera por tempo fixo: sempre esperar por elemento, URL ou resposta.
