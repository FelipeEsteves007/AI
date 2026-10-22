# Design System — CRM de Alunos

## Visão Geral

Sistema de design consistente, acessível e responsivo. Baseado em Tailwind CSS com componentes reutilizáveis e paleta de cores harmônica.

---

## 🎨 Paleta de Cores

### Cores Primárias

```
Primária (Azul)
#2563EB (principal)
#1D4ED8 (hover)
#1E40AF (active)
#DBEAFE (light/bg)
#0C4A6E (dark)

Secundária (Teal)
#14B8A6 (complementar)
#0D9488 (hover)
#0F766E (active)
#CCFBF1 (light/bg)
```

### Cores Semânticas

```
Sucesso (Verde)
#10B981 (principal)
#059669 (hover)
#047857 (active)
#ECFDF5 (light/bg)
#064E3B (dark)

Alerta (Amarelo)
#F59E0B (principal)
#D97706 (hover)
#B45309 (active)
#FFFBEB (light/bg)
#78350F (dark)

Erro (Vermelho)
#EF4444 (principal)
#DC2626 (hover)
#B91C1C (active)
#FEE2E2 (light/bg)
#7F1D1D (dark)

Informação (Azul claro)
#3B82F6 (principal)
#2563EB (hover)
#1D4ED8 (active)
#EFF6FF (light/bg)
#0C2340 (dark)
```

### Cores Neutras

```
Neutral (Cinza)
#6B7280 (padrão)
#4B5563 (hover)
#374151 (active)
#F3F4F6 (light/bg)
#1F2937 (dark)

Fundo (Off-white)
#F9FAFB (primário)
#FFFFFF (cards, modals)

Borders
#E5E7EB (padrão)
#D1D5DB (hover)

Text
#111827 (headings)
#374151 (body)
#6B7280 (secondary)
#9CA3AF (tertiary)
#D1D5DB (disabled)
```

### Escala de Cores (Tailwind)

```tailwindcss
/* use Tailwind defaults */
primary-50: #EFF6FF
primary-100: #DBEAFE
primary-200: #BFDBFE
primary-300: #93C5FD
primary-400: #60A5FA
primary-500: #3B82F6
primary-600: #2563EB  ← principal
primary-700: #1D4ED8  ← hover
primary-800: #1E40AF  ← active
primary-900: #1E3A8A
```

---

## 🔤 Tipografia

### Font Stack

```css
/* Sem serif (UI, headers) */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* Monospace (code, logs) */
font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
```

### Escala de Tamanhos

| Nome | Size | Weight | Line Height | Uso |
|------|------|--------|-------------|-----|
| **H1** | 32px / 2rem | 700 | 40px / 2.5rem | Page title |
| **H2** | 28px / 1.75rem | 700 | 36px / 2.25rem | Section title |
| **H3** | 24px / 1.5rem | 700 | 32px / 2rem | Subsection |
| **H4** | 20px / 1.25rem | 600 | 28px / 1.75rem | Card title |
| **Body Large** | 16px / 1rem | 400 | 24px / 1.5rem | Default text |
| **Body** | 14px / 0.875rem | 400 | 20px / 1.25rem | Secondary text |
| **Caption** | 12px / 0.75rem | 400 | 16px / 1rem | Hints, small labels |
| **Code** | 13px / 0.8125rem | 500 | 20px / 1.25rem | Code blocks |

### Tailwind Classes

```tailwindcss
/* Headings */
.h1 { @apply text-4xl font-bold leading-tight; }
.h2 { @apply text-3xl font-bold leading-tight; }
.h3 { @apply text-2xl font-bold leading-tight; }
.h4 { @apply text-xl font-semibold leading-snug; }

/* Body */
.body-lg { @apply text-base leading-relaxed; }
.body { @apply text-sm leading-relaxed; }
.caption { @apply text-xs leading-normal; }
.code { @apply text-sm font-mono leading-relaxed; }
```

---

## 🧩 Componentes

### Button (Primário)

```
Estado: Normal
┌───────────────────┐
│  [BLUE] Ação      │
└───────────────────┘
bg: #2563EB
fg: white
padding: 10px 16px
radius: 6px

Estado: Hover
┌───────────────────┐
│  [DARKER BLUE]    │
└───────────────────┘
bg: #1D4ED8

Estado: Active/Press
bg: #1E40AF

Estado: Disabled
┌───────────────────┐
│  [GRAY] Ação      │
└───────────────────┘
bg: #D1D5DB
fg: #9CA3AF
cursor: not-allowed
```

**Tailwind**:
```tsx
<button className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:text-gray-500 text-white px-4 py-2.5 rounded-md font-medium transition-colors">
  Ação
</button>
```

### Button (Secundário)

```
bg: #F3F4F6 (light gray)
fg: #374151 (dark gray)
border: 1px solid #E5E7EB

Hover:
bg: #E5E7EB
```

**Tailwind**:
```tsx
<button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-md font-medium border border-gray-300">
  Secundário
</button>
```

### Button (Danger)

```
bg: #EF4444 (red)
fg: white
Hover: #DC2626
Active: #B91C1C
```

**Tailwind**:
```tsx
<button className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-4 py-2.5 rounded-md font-medium">
  Deletar
</button>
```

---

### Card

```
┌─────────────────────────┐
│ Card Title              │
│                         │
│ Card content here...    │
│ More content...         │
│                         │
│ [Button] [Button]       │
└─────────────────────────┘

bg: white
border: 1px solid #E5E7EB
radius: 8px
shadow: 0 1px 3px rgba(0,0,0,0.1)
padding: 20px

Hover shadow: 0 10px 25px rgba(0,0,0,0.1)
```

**Tailwind**:
```tsx
<div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md p-6 transition-shadow">
  {/* content */}
</div>
```

---

### Input (Text/Email/Number)

```
┌────────────────────────────┐
│ Label (required *)          │
│                            │
│ [_____ placeholder text ___│
│                            │
└────────────────────────────┘

Normal:
border: 1px solid #E5E7EB
bg: white
padding: 10px 12px

Focus:
border: 2px solid #2563EB
ring: 2px solid #DBEAFE
outline: none

Error:
border: 2px solid #EF4444
ring: 2px solid #FEE2E2
```

**Tailwind**:
```tsx
<input 
  className="w-full px-3 py-2 border border-gray-300 rounded-md 
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
             placeholder-gray-400
             text-sm
             transition-colors"
/>
```

---

### Select (Dropdown)

```
┌─────────────────────┐
│ [Opção 1 ▼]         │
└─────────────────────┘

Quando aberto:
┌─────────────────────┐
│ [Opção 1 ▲]         │
├─────────────────────┤
│ Opção 1            │
│ Opção 2            │
│ Opção 3            │
└─────────────────────┘
```

**Tailwind**:
```tsx
<select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
  <option>Opção 1</option>
</select>
```

---

### Modal/Dialog

```
┌──────────────────────────────────┐
│ ╳ Título                          │
├──────────────────────────────────┤
│                                  │
│ Conteúdo do modal                │
│                                  │
├──────────────────────────────────┤
│ [Cancelar]            [Confirmar]│
└──────────────────────────────────┘

Backdrop: rgba(0,0,0,0.5)
Modal bg: white
Radius: 12px
Shadow: 0 20px 25px rgba(0,0,0,0.15)
Width: 90vw ou 500px max
```

**Tailwind**:
```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
    {/* content */}
  </div>
</div>
```

---

### Badge/Pill

```
Sucesso:
┌──────────┐
│ ✓ Ativo  │
└──────────┘
bg: #ECFDF5
fg: #047857
border: 1px solid #A7F3D0

Alerta:
┌──────────────┐
│ ⚠ Pausado    │
└──────────────┘
bg: #FFFBEB
fg: #B45309
border: 1px solid #FCD34D

Erro:
┌────────────┐
│ ✗ Inativo  │
└────────────┘
bg: #FEE2E2
fg: #B91C1C
border: 1px solid #FECACA
```

**Tailwind**:
```tsx
// Sucesso
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
  ✓ Ativo
</span>
```

---

### Table

```
┌───────────┬─────────────┬──────────┐
│ Nome      │ Email       │ Status   │
├───────────┼─────────────┼──────────┤
│ João      │ joao@...    │ Ativo    │
│ Maria     │ maria@...   │ Ativo    │
│ Pedro     │ pedro@...   │ Inativo  │
└───────────┴─────────────┴──────────┘

Header bg: #F9FAFB
Border: 1px solid #E5E7EB
Hover row: bg #F3F4F6
Padding: 12px
```

**Tailwind**:
```tsx
<table className="w-full">
  <thead className="bg-gray-50 border-b border-gray-200">
    <tr>
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-700">João</td>
    </tr>
  </tbody>
</table>
```

---

### Toast Notification

```
Sucesso (bottom-right):
┌─────────────────────┐
│ ✓ Aluno salvo!      │
└─────────────────────┘
bg: #10B981
fg: white
duration: 4s
animation: slide-in 300ms

Erro:
┌──────────────────────────┐
│ ✗ Erro ao salvar aluno   │
└──────────────────────────┘
bg: #EF4444
fg: white
duration: 6s

Informação:
┌──────────────────────┐
│ ℹ Operação em andamento...
└──────────────────────┘
bg: #3B82F6
fg: white
```

**Tailwind**:
```tsx
<div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in">
  ✓ Aluno salvo!
</div>
```

---

### Loading Skeleton

```
┌──────────────┐
│ ▓▓▓▓▓▓▓▓▓▓  │ (shimmer animation)
│              │
│ ▓▓▓▓▓▓▓▓    │
│              │
│ ▓▓▓▓▓▓▓▓▓▓  │
└──────────────┘

bg: #F3F4F6
animation: shimmer (left-to-right, 2s loop)
```

**Tailwind**:
```tsx
<div className="bg-gray-200 rounded h-4 w-full animate-pulse"></div>
```

---

## 📐 Espaçamento

### Escala (Tailwind)

```
0:    0px
1:    4px
2:    8px
3:    12px
4:    16px
6:    24px
8:    32px
12:   48px
16:   64px
20:   80px
24:   96px
```

### Padrões

```
Padding pequeno:    8px (p-2)
Padding padrão:     16px (p-4)
Padding grande:     24px (p-6)

Margin entre itens: 16px (gap-4)
Margin entre cards: 24px (gap-6)

Gutter horizontal:  16px (min em ambos os lados)
```

---

## 🔲 Border Radius

```
Pequeno (inputs, buttons):    6px (rounded-md)
Padrão (cards):               8px (rounded-lg)
Grande (modals):              12px (rounded-xl)
Circles (avatars):            50% (rounded-full)
```

---

## ✨ Sombras

```
Sutil:        0 1px 3px rgba(0,0,0,0.1)  (shadow-sm)
Padrão:       0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)  (shadow)
Hover:        0 10px 25px rgba(0,0,0,0.1)  (shadow-lg)
Modal:        0 20px 25px rgba(0,0,0,0.15)  (shadow-2xl)
```

---

## 🎬 Animações

### Transições

```css
/* Padrão */
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

/* Colors apenas */
transition: color, background-color, border-color 150ms ease;

/* Transform */
transition: transform 150ms ease, opacity 150ms ease;
```

### Animações Customizadas

```tailwindcss
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes shimmer {
  0%, 100% { background-position: -1000px 0; }
  50% { background-position: 1000px 0; }
}

.animate-slide-in {
  animation: slide-in 300ms ease;
}

.animate-shimmer {
  animation: shimmer 2s linear infinite;
}
```

---

## 📱 Responsive Breakpoints

```tailwindcss
Mobile:       < 640px   (default, xs)
              sm: 640px
Tablet:       md: 768px
              lg: 1024px
Desktop:      xl: 1280px
              2xl: 1536px
```

### Padrões

```tsx
/* Mobile-first */
<div className="
  grid grid-cols-1         /* mobile: 1 coluna */
  md:grid-cols-2           /* tablet: 2 colunas */
  lg:grid-cols-3           /* desktop: 3 colunas */
  gap-4
">
  {/* items */}
</div>

/* Ocultar em mobile */
<div className="hidden md:block">
  {/* side menu */}
</div>
```

---

## ♿ Acessibilidade

### Cores
- Contraste mínimo WCAG AA: 4.5:1 para texto normal
- Nunca use cor APENAS como diferenciador (adicione ícone/label)

### Tipografia
- `font-size` mínimo: 12px
- `line-height` mínimo: 1.5 para body text
- Máximo 70-80 caracteres por linha (readability)

### Interatividade
- Focus visible: `focus:outline-2 focus:outline-offset-2 focus:outline-blue-500`
- Hover states em links
- Skip to content link (top-left, hidden)
- Form labels always visible (not just placeholder)

### Keyboard Navigation
- Tab order faz sentido (top-to-bottom, left-to-right)
- Enter/Space em buttons e selects
- Esc fecha modals
- Arrow keys em Kanban board

### ARIA
```html
<!-- Loading -->
<div aria-busy="true" role="status">Carregando...</div>

<!-- Alert/Error -->
<div role="alert" aria-live="polite">Erro ao salvar</div>

<!-- Modal -->
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Título</h2>
</div>

<!-- Button disabled -->
<button disabled aria-disabled="true">Ação</button>
```

---

## 🎨 Modo Escuro (Futuro)

Ao implementar dark mode, usar Tailwind dark mode:

```tailwindcss
/* light mode (default) */
.bg-white

/* dark mode */
@media (prefers-color-scheme: dark) {
  .dark\:bg-gray-900
}
```

---

## Componentes Reutilizáveis (React)

Estrutura padrão:

```tsx
// components/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300',
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`
        rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
```

---

## 📚 Referências

- Tailwind CSS: https://tailwindcss.com/
- Headless UI (components): https://headlessui.com/
- Radix UI (primitives): https://www.radix-ui.com/
- WebAIM (a11y): https://webaim.org/

---

**Versão**: 1.0  
**Data**: 2026-09-11  
**Status**: Pronto para implementação
