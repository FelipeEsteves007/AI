# Especificação — 002 Login e Perfis de Acesso

## Problema

Hoje o sistema não tem login nem controle de acesso. Sem autenticação e sem papéis, nenhum módulo
do CRM (alunos, cursos, pipeline, tarefas) pode ser liberado para a equipe de ~10 pessoas com
segurança. Esta feature é a base de todas as outras.

## Usuários e papéis

| Papel | Quem | O que pode (nesta feature e na matriz de permissões) |
|-------|------|------------------------------------------------------|
| **Admin** | Adriano (e quem mais ele promover) | Tudo: gerenciar usuários, importar alunos, configurar o sistema, gerenciar cursos, excluir alunos, ver todos os dados |
| **CEO** | CEO | Vê todos os alunos, leads, tarefas, dashboard completo e relatórios. Não gerencia usuários, não importa e não altera configurações |
| **Vendedor** | 1 vendedor | Só os alunos e leads atribuídos a ele. Não exclui aluno e não vê os dados de outros vendedores |

Decidido na entrevista: vale a proposta da constitution (decisão em aberto nº 1 do `CLAUDE.md`).

### Matriz de permissões (implementada no backend nesta feature)

| Permissão | Admin | CEO | Vendedor |
|-----------|:-----:|:---:|:--------:|
| `users:manage` — gerenciar usuários | ✓ | ✗ | ✗ |
| `students:import` — importar alunos | ✓ | ✗ | ✗ |
| `settings:manage` — configurações do sistema | ✓ | ✗ | ✗ |
| `courses:manage` — gerenciar cursos | ✓ | ✗ | ✗ |
| `students:delete` — excluir aluno | ✓ | ✗ | ✗ |
| `data:view-all` — ver dados de todos os vendedores | ✓ | ✓ | ✗ |
| `tasks:write` — criar e editar tarefas | ✓ | ✓ | ✓ |

Nesta feature só `users:manage` protege telas e rotas reais. As demais permissões ficam prontas
na matriz e passam a ser aplicadas quando cada módulo existir.

## Funcionalidades

### Essenciais
- Login com e-mail e senha, logout e sessão de 24h (sem renovação automática)
- Troca obrigatória da senha provisória no primeiro acesso e troca voluntária a qualquer momento
- Tela **Usuários** (só admin): cadastrar usuário com senha provisória gerada pelo sistema,
  trocar papel, desativar, reativar e redefinir senha
- Script de seed para criar o primeiro admin
- Bloqueio após 5 tentativas de login erradas em 15 minutos
- Registro de auditoria dos logins e das ações sobre usuários
- Matriz de permissões aplicada no backend e proteção de todas as páginas

### Fora do escopo
- Convite por e-mail e "esqueci minha senha" por e-mail
- Login com Google ou outro provedor externo; verificação em duas etapas (2FA)
- Renovação automática da sessão (refresh token)
- Excluir usuário
- Regras de dados por papel nos módulos (ex.: vendedor só vê os próprios alunos) — aplicadas quando
  os módulos de alunos e leads existirem
- Tela para consultar o log de auditoria

## Regras de negócio

| ID | Regra |
|----|-------|
| RN-01 | E-mail é único e comparado sem diferenciar maiúsculas (guardado em minúsculas) |
| RN-02 | Papéis possíveis: `admin`, `ceo`, `vendedor` |
| RN-03 | Senha com no mínimo 6 caracteres (constitution); a nova senha precisa ser diferente da atual |
| RN-04 | A senha provisória é gerada pelo sistema e exibida **uma única vez** ao admin, na criação ou na redefinição |
| RN-05 | Quem está com senha provisória só pode trocar a senha ou sair; todo o resto responde bloqueado |
| RN-06 | Login com erro mostra sempre "E-mail ou senha incorretos", inclusive para usuário desativado |
| RN-07 | Com 5 falhas de login para o mesmo e-mail nos últimos 15 minutos (contadas após o último login bem-sucedido), novas tentativas são recusadas até a janela passar |
| RN-08 | Sessão: JWT HS256 com validade de 24h, somente em cookie HttpOnly |
| RN-09 | Usuário desativado perde o acesso na requisição seguinte, mesmo com sessão aberta |
| RN-10 | Trocar ou redefinir a senha encerra as outras sessões daquele usuário |
| RN-11 | Usuários nunca são excluídos: só desativados e reativados |
| RN-12 | Pode haver mais de um admin, mas o último admin ativo não pode ser desativado nem rebaixado |
| RN-13 | Senha guardada só como hash bcrypt (10 rounds); hash e senhas escolhidas pelo usuário nunca saem na API |
| RN-14 | Auditoria grava quem, quando, alvo e IP de: login (sucesso, falha, bloqueio), logout, troca de senha, criação de usuário, troca de papel, desativação, reativação e redefinição de senha |

## Cenários de uso

| ID | Ator | Cenário | Resultado esperado |
|----|------|---------|--------------------|
| CU-01 | Todos | Login com credenciais corretas | Entra e vai para a tela inicial |
| CU-02 | Todos | Login com e-mail ou senha errados | "E-mail ou senha incorretos" |
| CU-03 | Todos | 6ª tentativa após 5 erros em 15 min | Tentativa recusada com aviso de bloqueio temporário |
| CU-04 | Todos | Primeiro acesso com senha provisória | Vai direto para a troca de senha; nada mais abre antes disso |
| CU-05 | Todos | Troca voluntária de senha | Senha trocada; outras sessões do usuário encerradas |
| CU-06 | Todos | Logout | Sessão encerrada; volta para o login |
| CU-07 | Todos | Sessão com mais de 24h | Volta para o login |
| CU-08 | Admin | Cadastrar usuário (nome, e-mail, papel) | Usuário criado; senha provisória exibida uma vez |
| CU-09 | Admin | Trocar o papel de um usuário | Papel alterado; vale na próxima requisição do usuário |
| CU-10 | Admin | Desativar e reativar usuário | Desativado perde o acesso na hora; reativado volta a entrar |
| CU-11 | Admin | Desativar ou rebaixar o último admin ativo | Operação recusada com mensagem explicando o motivo |
| CU-12 | Admin | Redefinir senha de um usuário | Nova senha provisória exibida uma vez; troca obrigatória no próximo login |
| CU-13 | CEO, Vendedor | Abrir a tela Usuários ou chamar a API de usuários | Item não aparece no menu; a API responde 403 |
| CU-14 | — | Primeira instalação | Script de seed cria o primeiro admin com senha provisória |

## Critérios de aceitação

- [ ] 1. Os três papéis entram com e-mail e senha; credencial errada mostra "E-mail ou senha incorretos", sem dizer qual dos dois errou
- [ ] 2. Sem login, qualquer página leva para `/login` e qualquer rota da API responde 401 (exceto `/health` e o login)
- [ ] 3. Quem está com senha provisória não acessa nada até trocá-la
- [ ] 4. CEO e vendedor recebem 403 nas rotas de usuários (bloqueio no backend) e não veem "Usuários" no menu
- [ ] 5. Usuário desativado perde o acesso na requisição seguinte, mesmo com a sessão aberta
- [ ] 6. O sistema impede desativar ou rebaixar o último admin ativo
- [ ] 7. Depois de 5 tentativas erradas em 15 minutos, a próxima tentativa de login é bloqueada
- [ ] 8. O JWT só trafega em cookie HttpOnly e nenhuma senha escolhida pelo usuário nem hash aparece nas respostas da API (a senha provisória aparece uma única vez, para o admin, na criação e na redefinição — ver RN-04)
- [ ] 9. O logout encerra a sessão
- [ ] 10. A linha de verificação do `CLAUDE.md` passa inteira, com cobertura mínima de 70%

## Decisões em aberto

- [ ] O admin pode desativar a própria conta quando existe outro admin ativo?
- [ ] Permissões do CEO para criar e editar alunos e leads, e de quem pode enviar e-mail — definir na feature de cada módulo

---

**Versão**: 1.0  
**Data**: 2026-09-11
