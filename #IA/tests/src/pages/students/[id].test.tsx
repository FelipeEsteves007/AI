import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { formatDateTime } from '@/components/Students/studentFormat';
import StudentDetailPage from '@/pages/students/[id]';
import { ApiError } from '@/services/apiClient';
import type { Permission } from '@/types/auth';
import type { StudentDetailResponse, StudentResponse } from '@/types/students';

import { makeStudentDetail, STUDENT_ID } from '../../components/Students/studentFixtures';

let permissions: Permission[] = [];

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1' },
    permissions,
    can: (permission: Permission) => permissions.includes(permission),
  }),
}));

const push = jest.fn();
let query: Record<string, string | string[]> = {};
let isReady = true;

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/students/[id]', query, isReady, push }),
}));

const getStudent = jest.fn();
const updateStudent = jest.fn();
const deleteStudent = jest.fn();

jest.mock('@/services/studentsService', () => ({
  getStudent: (...args: unknown[]) => getStudent(...args),
  updateStudent: (...args: unknown[]) => updateStudent(...args),
  deleteStudent: (...args: unknown[]) => deleteStudent(...args),
}));

const listCourses = jest.fn();
const createPurchase = jest.fn();

jest.mock('@/services/coursesService', () => ({
  listCourses: (...args: unknown[]) => listCourses(...args),
  createPurchase: (...args: unknown[]) => createPurchase(...args),
}));

const sendEmail = jest.fn();

jest.mock('@/services/emailService', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const createTask = jest.fn();

jest.mock('@/services/tasksService', () => ({
  createTask: (...args: unknown[]) => createTask(...args),
}));

describe('nova tarefa no detalhe do aluno (Sprint 8)', () => {
  it('abre o modal já vinculado ao aluno e mostra a tarefa no card', async () => {
    createTask.mockResolvedValue({
      id: 't-novo',
      title: 'Ligar amanhã',
      description: null,
      priority: 'normal',
      dueDate: '2026-01-01T15:00:00.000Z',
      completed: false,
      completedAt: null,
      studentId: STUDENT_ID,
      studentName: 'x',
      createdAt: '2026-01-01T10:00:00.000Z',
    });
    await renderLoaded();

    fireEvent.click(screen.getByRole('button', { name: 'Nova tarefa' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova tarefa' });
    fireEvent.change(within(dialog).getByLabelText('Título'), { target: { value: 'Ligar amanhã' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Ligar amanhã', studentId: STUDENT_ID }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('region', { name: 'Tarefas' })).toHaveTextContent('Ligar amanhã');
  });
});

describe('adicionar curso ao aluno (TASK-018)', () => {
  it('abre o modal pelo card, registra a compra e atualiza o card sem recarregar', async () => {
    listCourses.mockResolvedValue({
      data: [
        {
          id: 'c-novo',
          name: 'Claude Code',
          description: null,
          price: 1997,
          isActive: true,
          createdAt: '2026-09-01T10:00:00.000Z',
          updatedAt: '2026-09-01T10:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 500, total: 1, totalPages: 1 },
    });
    createPurchase.mockResolvedValue({
      id: 'p-novo',
      studentId: STUDENT_ID,
      courseId: 'c-novo',
      courseName: 'Claude Code',
      purchaseDate: '2026-09-13',
      amount: 1997,
      notes: null,
      createdAt: '2026-09-13T10:00:00.000Z',
    });
    await renderLoaded();

    const card = screen.getByRole('region', { name: 'Cursos comprados' });
    fireEvent.click(within(card).getByRole('button', { name: '+ Adicionar curso' }));
    const dialog = screen.getByRole('dialog', { name: 'Adicionar curso' });
    await within(dialog).findByRole('option', { name: 'Claude Code' });
    fireEvent.change(within(dialog).getByLabelText('Curso'), { target: { value: 'c-novo' } });
    fireEvent.change(within(dialog).getByLabelText('Data da compra'), {
      target: { value: '2026-09-13' },
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });

    expect(createPurchase).toHaveBeenCalledWith(
      STUDENT_ID,
      expect.objectContaining({ courseId: 'c-novo', purchaseDate: '2026-09-13' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(card).getAllByRole('listitem')[0]).toHaveTextContent('Claude Code');
    expect(getStudent).toHaveBeenCalledTimes(1);
  });
});

const ADMIN: Permission[] = [
  'users:manage',
  'students:import',
  'settings:manage',
  'courses:manage',
  'students:delete',
  'data:view-all',
  'tasks:write',
];
const CEO: Permission[] = ['data:view-all', 'tasks:write'];
const VENDEDOR: Permission[] = ['tasks:write'];

let detail: StudentDetailResponse;

function serverResponse(patch: Partial<StudentResponse>): StudentResponse {
  const { courses: _c, pipelineLeads: _l, tasks: _t, ...base } = detail;
  return { ...base, updatedAt: '2026-09-12T15:45:00.000Z', ...patch };
}

async function renderLoaded(): Promise<void> {
  render(<StudentDetailPage />);
  await screen.findByRole('heading', { level: 1, name: detail.name });
}

function profile(): HTMLElement {
  return screen.getByRole('region', { name: 'Dados pessoais' });
}

async function editAndBlur(label: string, value: string, role: 'textbox' | 'combobox' = 'textbox') {
  fireEvent.click(within(profile()).getByRole('button', { name: `Editar ${label.toLowerCase()}` }));
  const input = within(profile()).getByRole(role, { name: label });
  fireEvent.change(input, { target: { value } });
  await act(async () => {
    fireEvent.blur(input);
  });
}

beforeEach(() => {
  permissions = VENDEDOR;
  query = { id: STUDENT_ID };
  isReady = true;
  detail = makeStudentDetail();
  push.mockReset();
  getStudent.mockReset().mockImplementation(async () => detail);
  updateStudent.mockReset();
  deleteStudent.mockReset().mockResolvedValue(undefined);
});

describe('página de detalhe do aluno', () => {
  it('busca o aluno pelo id da URL e exibe os 5 cards', async () => {
    await renderLoaded();

    expect(getStudent).toHaveBeenCalledTimes(1);
    expect(getStudent).toHaveBeenCalledWith(STUDENT_ID);

    const personal = profile();
    expect(within(personal).getByText('joao@email.com')).toBeInTheDocument();
    expect(within(personal).getByText('(11) 98765-4321')).toBeInTheDocument();
    expect(within(personal).getByText('123.456.789-09')).toBeInTheDocument();
    expect(within(personal).getByText('Ativo')).toBeInTheDocument();
    expect(within(personal).getByText('Bob Vendedor')).toBeInTheDocument();

    expect(
      within(screen.getByRole('region', { name: 'Cursos comprados' })).getByText('Imersão em IA'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Oportunidades' })).getByText('Negociação'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Tarefas' })).getByText('Ligar para João'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Anotações' })).getByText('Interessado em IA.'),
    ).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Alunos' })).toHaveAttribute('href', '/students');
  });

  it('mostra os estados vazios', async () => {
    detail = makeStudentDetail({ courses: [], pipelineLeads: [], tasks: [], notes: null, phone: null, cpf: null });
    await renderLoaded();

    expect(screen.getByText('Nenhum curso comprado ainda.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma oportunidade para este aluno.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma tarefa para este aluno.')).toBeInTheDocument();
    expect(screen.getByText('Sem anotações.')).toBeInTheDocument();
    expect(within(profile()).getAllByText('Não informado')).toHaveLength(2);
  });

  it('mostra o skeleton enquanto carrega', async () => {
    let resolve: (value: StudentDetailResponse) => void = () => undefined;
    getStudent.mockReturnValue(
      new Promise<StudentDetailResponse>((done) => {
        resolve = done;
      }),
    );

    render(<StudentDetailPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/carregando aluno/i);
    expect(screen.queryByRole('region', { name: 'Dados pessoais' })).not.toBeInTheDocument();

    await act(async () => resolve(detail));

    expect(screen.queryByText(/carregando aluno/i)).not.toBeInTheDocument();
    expect(profile()).toBeInTheDocument();
  });

  it('espera o router ficar pronto antes de buscar', () => {
    isReady = false;
    query = {};

    render(<StudentDetailPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/carregando aluno/i);
    expect(getStudent).not.toHaveBeenCalled();
  });

  describe('edição inline', () => {
    it('salva o nome ao sair do campo com o payload só do campo', async () => {
      updateStudent.mockImplementation(async (_id: string, payload: Partial<StudentResponse>) =>
        serverResponse(payload),
      );
      await renderLoaded();

      await editAndBlur('Nome', 'João Silva Souza');

      expect(updateStudent).toHaveBeenCalledTimes(1);
      expect(updateStudent).toHaveBeenCalledWith(STUDENT_ID, { name: 'João Silva Souza' });
    });

    it('não dispara PUT quando o valor não mudou', async () => {
      await renderLoaded();

      await editAndBlur('E-mail', 'joao@email.com');
      await editAndBlur('Status', 'ativo', 'combobox');

      expect(updateStudent).not.toHaveBeenCalled();
    });

    it('a tela reflete a resposta do servidor, inclusive o updatedAt', async () => {
      // O servidor grava o CPF só com dígitos e devolve um novo updatedAt.
      updateStudent.mockResolvedValue(serverResponse({ cpf: '98765432100' }));
      await renderLoaded();

      await editAndBlur('CPF', '987.654.321-00');

      expect(updateStudent).toHaveBeenCalledWith(STUDENT_ID, { cpf: '987.654.321-00' });
      expect(await within(profile()).findByText('987.654.321-00')).toBeInTheDocument();
      expect(
        within(profile()).getByText(formatDateTime('2026-09-12T15:45:00.000Z'), { exact: false }),
      ).toBeInTheDocument();
      // Os cards relacionados continuam na tela depois do PUT (que não os devolve).
      expect(screen.getByText('Imersão em IA')).toBeInTheDocument();
    });

    it('telefone e CPF vazios vão como null', async () => {
      updateStudent.mockImplementation(async (_id: string, payload: Partial<StudentResponse>) =>
        serverResponse(payload),
      );
      await renderLoaded();

      await editAndBlur('Telefone', '   ');

      expect(updateStudent).toHaveBeenCalledWith(STUDENT_ID, { phone: null });
      expect(await within(profile()).findByText('Não informado')).toBeInTheDocument();
    });

    it('salva o status escolhido', async () => {
      updateStudent.mockResolvedValue(serverResponse({ status: 'pausado' }));
      await renderLoaded();

      await editAndBlur('Status', 'pausado', 'combobox');

      expect(updateStudent).toHaveBeenCalledWith(STUDENT_ID, { status: 'pausado' });
      expect(await within(profile()).findByText('Pausado')).toBeInTheDocument();
    });

    it('409 EMAIL_IN_USE reverte o e-mail e mostra a mensagem junto do campo', async () => {
      updateStudent.mockRejectedValue(new ApiError(409, 'EMAIL_IN_USE', 'E-mail em uso'));
      await renderLoaded();

      await editAndBlur('E-mail', 'ana@email.com');

      expect(within(profile()).getByText('joao@email.com')).toBeInTheDocument();
      expect(within(profile()).queryByText('ana@email.com')).not.toBeInTheDocument();
      expect(within(profile()).getByRole('alert')).toHaveTextContent(
        'E-mail já cadastrado em outro aluno',
      );
    });

    it('409 CPF_IN_USE reverte o CPF e mostra a mensagem junto do campo', async () => {
      updateStudent.mockRejectedValue(new ApiError(409, 'CPF_IN_USE', 'CPF em uso'));
      await renderLoaded();

      await editAndBlur('CPF', '11144477735');

      expect(within(profile()).getByText('123.456.789-09')).toBeInTheDocument();
      expect(within(profile()).getByRole('alert')).toHaveTextContent('CPF já cadastrado em outro aluno');
    });

    it('400 VALIDATION_ERROR mostra a mensagem do details do campo', async () => {
      updateStudent.mockRejectedValue(
        new ApiError(400, 'VALIDATION_ERROR', 'Dados inválidos', { name: 'Nome é obrigatório' }),
      );
      await renderLoaded();

      await editAndBlur('Nome', 'X'.repeat(300));

      expect(within(profile()).getByRole('alert')).toHaveTextContent('Nome é obrigatório');
      expect(screen.getByRole('heading', { level: 1, name: 'João Silva' })).toBeInTheDocument();
    });

    it('Esc cancela a edição sem salvar', async () => {
      await renderLoaded();

      fireEvent.click(within(profile()).getByRole('button', { name: 'Editar nome' }));
      const input = within(profile()).getByRole('textbox', { name: 'Nome' });
      fireEvent.change(input, { target: { value: 'Outro Nome' } });
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Escape' });
      });

      expect(updateStudent).not.toHaveBeenCalled();
      expect(within(profile()).queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'João Silva' })).toBeInTheDocument();
    });

    it('Enter salva', async () => {
      updateStudent.mockResolvedValue(serverResponse({ email: 'novo@email.com' }));
      await renderLoaded();

      fireEvent.click(within(profile()).getByRole('button', { name: 'Editar e-mail' }));
      const input = within(profile()).getByRole('textbox', { name: 'E-mail' });
      fireEvent.change(input, { target: { value: 'novo@email.com' } });
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(updateStudent).toHaveBeenCalledWith(STUDENT_ID, { email: 'novo@email.com' });
      expect(await within(profile()).findByText('novo@email.com')).toBeInTheDocument();
    });

    it('anotações salvam ao sair do campo e vazio vira null', async () => {
      updateStudent.mockImplementation(async (_id: string, payload: Partial<StudentResponse>) =>
        serverResponse(payload),
      );
      await renderLoaded();
      const notes = screen.getByRole('region', { name: 'Anotações' });

      fireEvent.click(within(notes).getByRole('button', { name: 'Editar anotações' }));
      const textarea = within(notes).getByRole('textbox', { name: 'Anotações' });
      fireEvent.change(textarea, { target: { value: 'Pediu desconto.' } });
      await act(async () => {
        fireEvent.blur(textarea);
      });
      expect(updateStudent).toHaveBeenLastCalledWith(STUDENT_ID, { notes: 'Pediu desconto.' });
      expect(await within(notes).findByText('Pediu desconto.')).toBeInTheDocument();

      fireEvent.click(within(notes).getByRole('button', { name: 'Editar anotações' }));
      const again = within(notes).getByRole('textbox', { name: 'Anotações' });
      fireEvent.change(again, { target: { value: '' } });
      await act(async () => {
        fireEvent.blur(again);
      });
      expect(updateStudent).toHaveBeenLastCalledWith(STUDENT_ID, { notes: null });
      expect(await within(notes).findByText('Sem anotações.')).toBeInTheDocument();
    });

    it('erro ao salvar anotações reverte e mostra a mensagem', async () => {
      updateStudent.mockRejectedValue(new ApiError(500, 'UNKNOWN_ERROR', 'boom'));
      await renderLoaded();
      const notes = screen.getByRole('region', { name: 'Anotações' });

      fireEvent.click(within(notes).getByRole('button', { name: 'Editar anotações' }));
      const textarea = within(notes).getByRole('textbox', { name: 'Anotações' });
      fireEvent.change(textarea, { target: { value: 'Outra coisa' } });
      await act(async () => {
        fireEvent.blur(textarea);
      });

      expect(within(notes).getByText('Interessado em IA.')).toBeInTheDocument();
      expect(within(notes).getByRole('alert')).toHaveTextContent(/não foi possível salvar/i);
    });
    it('resposta atrasada de um campo não apaga o valor salvo de outro (respostas fora de ordem)', async () => {
      const pending: Record<string, (response: StudentResponse) => void> = {};
      updateStudent.mockImplementation(
        (_id: string, payload: Partial<StudentResponse>) =>
          new Promise<StudentResponse>((resolve) => {
            pending[Object.keys(payload)[0]] = resolve;
          }),
      );
      await renderLoaded();

      // O PUT do telefone sai primeiro, o do status depois.
      await editAndBlur('Telefone', '(11) 90000-0000');
      await editAndBlur('Status', 'pausado', 'combobox');
      expect(Object.keys(pending).sort()).toEqual(['phone', 'status']);

      // A resposta do status chega antes...
      await act(async () =>
        pending.status(serverResponse({ status: 'pausado', updatedAt: '2026-09-12T15:46:00.000Z' })),
      );
      expect(await within(profile()).findByText('Pausado')).toBeInTheDocument();

      // ...e a do telefone depois, ainda com o status antigo gravado no momento dela.
      await act(async () =>
        pending.phone(
          serverResponse({
            phone: '(11) 90000-0000',
            status: 'ativo',
            updatedAt: '2026-09-12T15:45:00.000Z',
          }),
        ),
      );

      expect(within(profile()).getByText('Pausado')).toBeInTheDocument();
      expect(within(profile()).queryByText('Ativo')).not.toBeInTheDocument();
      expect(within(profile()).getByText('(11) 90000-0000')).toBeInTheDocument();
      // O updatedAt também não volta no tempo.
      expect(
        within(profile()).getByText(formatDateTime('2026-09-12T15:46:00.000Z'), { exact: false }),
      ).toBeInTheDocument();
    });

    it('404 no PUT (aluno excluído ou reatribuído) troca a página para "Aluno não encontrado"', async () => {
      updateStudent.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Não encontrado'));
      await renderLoaded();

      await editAndBlur('Nome', 'Outro Nome');

      expect(await screen.findByRole('heading', { name: 'Aluno não encontrado' })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Dados pessoais' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /voltar para alunos/i })).toHaveAttribute(
        'href',
        '/students',
      );
    });
  });

  describe('ações', () => {
    it('Editar coloca o foco no primeiro campo de dados pessoais em edição', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

      expect(within(profile()).getByRole('textbox', { name: 'Nome' })).toHaveFocus();
    });

    it('Enviar e-mail abre o modal, envia para o aluno e confirma na tela', async () => {
      sendEmail.mockResolvedValue({ messageId: 'm-1', to: detail.email });
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Enviar e-mail' }));
      const dialog = screen.getByRole('dialog', { name: 'Enviar e-mail' });
      expect(dialog).toHaveTextContent(detail.email);
      fireEvent.change(within(dialog).getByLabelText('Assunto'), { target: { value: 'Oi' } });
      fireEvent.change(within(dialog).getByLabelText('Mensagem'), { target: { value: 'Olá {{name}}' } });
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
      });

      expect(sendEmail).toHaveBeenCalledWith(STUDENT_ID, { subject: 'Oi', body: 'Olá {{name}}' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(`E-mail enviado para ${detail.email}.`);
    });

    it.each([
      ['vendedor', VENDEDOR],
      ['CEO', CEO],
    ])('%s não vê Excluir', async (_name, perms) => {
      permissions = perms;
      await renderLoaded();

      expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    });

    it('admin exclui depois de confirmar e volta para /students', async () => {
      permissions = ADMIN;
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
      const dialog = screen.getByRole('dialog', { name: /excluir aluno/i });
      expect(dialog).toHaveTextContent('João Silva');
      expect(deleteStudent).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: /^excluir$/i }));
      });

      expect(deleteStudent).toHaveBeenCalledWith(STUDENT_ID);
      await waitFor(() => expect(push).toHaveBeenCalledWith('/students'));
    });

    it('cancelar a exclusão não exclui', async () => {
      permissions = ADMIN;
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(deleteStudent).not.toHaveBeenCalled();
    });

    it('403 na exclusão mostra a mensagem e não navega', async () => {
      permissions = ADMIN;
      deleteStudent.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Proibido'));
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
      await act(async () => {
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^excluir$/i }));
      });

      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
        /não tem permissão para excluir/i,
      );
      expect(push).not.toHaveBeenCalled();
    });

    it('404 na exclusão mostra a mensagem', async () => {
      permissions = ADMIN;
      deleteStudent.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Não encontrado'));
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
      await act(async () => {
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^excluir$/i }));
      });

      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
        /não foi encontrado/i,
      );
      expect(push).not.toHaveBeenCalled();
    });
  });

  describe('erros de carregamento', () => {
    it('404 mostra "Aluno não encontrado" com link para a lista', async () => {
      getStudent.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Não encontrado'));

      render(<StudentDetailPage />);

      expect(await screen.findByRole('heading', { name: 'Aluno não encontrado' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /voltar para alunos/i })).toHaveAttribute(
        'href',
        '/students',
      );
      expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
    });

    it('id inválido na URL mostra 404 amigável sem chamar a API', async () => {
      query = { id: 'lixo<script>' };

      render(<StudentDetailPage />);

      expect(await screen.findByRole('heading', { name: 'Aluno não encontrado' })).toBeInTheDocument();
      expect(getStudent).not.toHaveBeenCalled();
    });

    it('erro genérico permite tentar novamente', async () => {
      getStudent.mockRejectedValueOnce(new ApiError(500, 'UNKNOWN_ERROR', 'boom'));

      render(<StudentDetailPage />);

      expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar o aluno/i);
      fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

      expect(await screen.findByRole('heading', { level: 1, name: 'João Silva' })).toBeInTheDocument();
      expect(getStudent).toHaveBeenCalledTimes(2);
    });
  });
});
