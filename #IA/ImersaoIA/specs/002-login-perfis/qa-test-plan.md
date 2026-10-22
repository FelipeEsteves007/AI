# Plano de Testes (QA) — 002 Login e Perfis de Acesso

## 1. Montagem do ambiente

### Pré-requisitos
- Node.js 20 ou mais novo (`node -v`)
- PostgreSQL 14 ou mais novo acessível em `localhost:5432` (decisão D1 do `plan.md`).
  Recomendado no WSL (Ubuntu):
  ```
  sudo apt update && sudo apt install -y postgresql
  sudo service postgresql start      # repetir após reiniciar o WSL, se o systemd estiver desligado
  sudo -u postgres psql -c "CREATE USER crm WITH PASSWORD 'troque-esta-senha' CREATEDB;"
  sudo -u postgres createdb -O crm crm_alunos
  sudo -u postgres createdb -O crm crm_alunos_test
  ```
  Alternativa no Windows: `winget install PostgreSQL.PostgreSQL.17`.
- Navegador atualizado (Chrome ou Edge)

### Passo a passo
1. Criar o banco de QA no PostgreSQL: `crm_alunos` (ou `crm_alunos_qa`, se preferir separar).
2. Na pasta do projeto:
   ```
   npm install
   cp .env.example .env.local
   ```
3. Preencher o `.env.local`:
   - `DATABASE_URL="postgresql://<usuario>:<senha>@localhost:5432/crm_alunos?schema=public"`
   - `JWT_SECRET=` um texto longo e aleatório (mínimo 32 caracteres)
   - `API_URL=http://localhost:3001`
   - `SEED_ADMIN_NAME=Admin QA` e `SEED_ADMIN_EMAIL=admin.qa@teste.local`
4. Criar as tabelas: `npm run db:migrate`
5. Criar o primeiro admin: `npm run db:seed-admin` — **anote a senha provisória exibida no terminal**
   (ela aparece uma única vez).
6. Subir o sistema em dois terminais:
   ```
   npm run dev:api     # API em http://localhost:3001
   npm run dev         # sistema em http://localhost:3000
   ```
7. Conferir: `http://localhost:3001/health` responde `{"status":"ok"}` e `http://localhost:3000` abre a tela de login.

### Usuários de teste (um por papel)
Depois de entrar como admin e trocar a senha provisória, criar pela tela **Usuários**:

| Papel | Nome | E-mail |
|-------|------|--------|
| Admin (seed) | Admin QA | `admin.qa@teste.local` |
| Admin 2 | Admin Dois | `admin2.qa@teste.local` |
| CEO | CEO QA | `ceo.qa@teste.local` |
| Vendedor | Vendedor QA | `vendedor.qa@teste.local` |

Anote cada senha provisória e faça o primeiro login de cada um para definir a senha definitiva.

## 2. Massa de dados

Use **somente dados fictícios**: e-mails no domínio `@teste.local` e nomes inventados. Nunca use
dados reais de alunos ou da equipe. Esta feature não tem importação de arquivo.

Senhas para os testes de validação:

| Caso | Valor |
|------|-------|
| Curta demais (5 caracteres) | `abc12` |
| Mínima válida (6 caracteres) | `abc123` |
| Senha errada para bloqueio | `errada-01` |

## 3. Casos de teste

### Login e sessão

| ID | Papel | Pré-condição | Passos | Resultado esperado |
|----|-------|--------------|--------|--------------------|
| CT-01 | Admin, CEO, Vendedor | Usuário ativo com senha definitiva | Entrar com e-mail e senha corretos | Vai para a tela inicial; nome do usuário aparece no topo |
| CT-02 | Qualquer | — | Entrar com e-mail certo e senha errada | "E-mail ou senha incorretos" |
| CT-03 | Qualquer | — | Entrar com e-mail inexistente | Mesma mensagem do CT-02 (não revela que o e-mail não existe) |
| CT-04 | Qualquer | — | Entrar com o e-mail em MAIÚSCULAS | Login funciona |
| CT-05 | Qualquer | — | Enviar o formulário com campos vazios | Campos obrigatórios sinalizados; nada é enviado |
| CT-06 | Qualquer | Nenhum erro recente | Errar a senha 5 vezes seguidas e tentar a 6ª com a senha **certa** | 6ª tentativa recusada com aviso de bloqueio temporário |
| CT-07 | Qualquer | CT-06 executado | Aguardar 15 minutos e entrar com a senha certa | Login funciona |
| CT-08 | Qualquer | Logado | Clicar em **Sair** e depois usar o botão Voltar do navegador | Volta para o login; páginas internas não abrem |
| CT-09 | — | Deslogado | Abrir direto `http://localhost:3000/settings/users` | Redireciona para `/login` |
| CT-10 | — | Deslogado | Abrir `http://localhost:3001/api/users` no navegador | Resposta 401 |
| CT-11 | Qualquer | Logado | Nas ferramentas do navegador (F12 → Application → Cookies), inspecionar o cookie `crm_session` | Marcado como HttpOnly; nada de token no Local Storage |

### Senha provisória e troca de senha

| ID | Papel | Pré-condição | Passos | Resultado esperado |
|----|-------|--------------|--------|--------------------|
| CT-12 | Qualquer | Usuário recém-criado | Entrar com a senha provisória | Vai direto para a troca de senha |
| CT-13 | Qualquer | Na troca obrigatória | Tentar abrir outra página pela URL | Continua preso na troca de senha |
| CT-14 | Qualquer | Na troca de senha | Nova senha com 5 caracteres | Recusada com mensagem de mínimo de 6 |
| CT-15 | Qualquer | Na troca de senha | Nova senha igual à atual | Recusada |
| CT-16 | Qualquer | Na troca de senha | Nova senha válida | Entra no sistema; próximo login usa a senha nova |
| CT-17 | Qualquer | Logado em dois navegadores | Trocar a senha no navegador A e atualizar a página no B | Navegador B volta para o login |

### Gestão de usuários (admin)

| ID | Papel | Pré-condição | Passos | Resultado esperado |
|----|-------|--------------|--------|--------------------|
| CT-18 | Admin | Logado | Cadastrar usuário com nome, e-mail e papel | Usuário aparece na lista; senha provisória exibida uma vez com aviso |
| CT-19 | Admin | CT-18 | Fechar o aviso da senha provisória e procurá-la de novo | Não há como ver a senha outra vez |
| CT-20 | Admin | Usuário existente | Cadastrar outro com o mesmo e-mail (inclusive com maiúsculas) | Recusado: e-mail já em uso |
| CT-21 | Admin | — | Cadastrar com e-mail inválido ou nome vazio | Recusado com mensagem no campo |
| CT-22 | Admin | Vendedor QA logado em outro navegador | Trocar o papel do Vendedor QA para CEO | No outro navegador, após atualizar, o novo papel vale |
| CT-23 | Admin | Vendedor QA logado em outro navegador | Desativar o Vendedor QA | No outro navegador, a próxima ação leva ao login; login do vendedor recusado com a mensagem genérica |
| CT-24 | Admin | CT-23 | Reativar o Vendedor QA | Vendedor volta a entrar com a senha que tinha |
| CT-25 | Admin | Só um admin ativo | Tentar desativar a si mesmo ou mudar o próprio papel | Recusado, explicando que é o último admin ativo |
| CT-26 | Admin | Dois admins ativos | Desativar o Admin Dois | Permitido |
| CT-27 | Admin | CEO QA existente | Redefinir a senha do CEO QA | Nova senha provisória exibida uma vez; no próximo login o CEO é obrigado a trocar |

### Matriz de permissões por papel

| ID | Verificação | Admin | CEO | Vendedor |
|----|-------------|:-----:|:---:|:--------:|
| CT-28 | Item "Usuários" aparece no menu | Sim | Não | Não |
| CT-29 | Abrir `/settings/users` pela URL | Abre | Bloqueado | Bloqueado |
| CT-30 | Chamar a API de usuários logado (ex.: `http://localhost:3001/api/users` com a sessão ativa) | 200 | 403 | 403 |

## 4. Regressão

| ID | O que retestar | Resultado esperado |
|----|----------------|--------------------|
| RG-01 | `http://localhost:3001/health` sem login | `{"status":"ok"}` |
| RG-02 | Layout base (cabeçalho "CRM de Alunos") em todas as páginas logadas | Aparece normalmente |
| RG-03 | `npm run build` | Termina sem erro |

## 5. Critério de aceite do QA e reporte de bugs

**Aceite**: todos os casos CT-01 a CT-30 e RG-01 a RG-03 aprovados. Os critérios 1 a 9 da `spec.md`
precisam estar cobertos por pelo menos um caso aprovado.

**Como reportar um bug**:
- ID do caso de teste e papel usado
- Passos exatos para reproduzir
- Resultado esperado × resultado obtido
- Evidência: print ou vídeo, e a resposta da API (F12 → Network) quando for o caso
- Navegador e horário (para cruzar com o log de auditoria)

---

**Versão**: 1.0  
**Data**: 2026-09-11
