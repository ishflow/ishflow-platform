// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks --------------------------------------------------------------

const inviteMemberActionMock = vi.fn(async (_fd: FormData) => ({ ok: true as const }));

vi.mock('@/app/[locale]/(app)/admin/members/actions', () => ({
  inviteMemberAction: (fd: FormData) => inviteMemberActionMock(fd),
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    // Return a deterministic, namespace-scoped string so tests can assert
    // exact labels (e.g. roleLabels.sales => "role:sales").
    if (namespace === 'roleLabels') return `role:${key}`;
    return key;
  },
}));

// base-ui Select is impossible to drive reliably in jsdom (portal + pointer
// events + scroll polyfills). Swap it for a plain native <select> so this
// test can verify the InviteMemberDialog wiring (not base-ui's behavior,
// which is owned by the shadcn/base-ui primitive tests).
vi.mock('@/components/ui/select', () => {
  type RootProps = {
    value: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
    items?: unknown;
  };

  const Ctx = React.createContext<{ value: string; onChange: (v: string) => void } | null>(null);

  function Select({ value, onValueChange, children }: RootProps) {
    const ctx = React.useMemo(
      () => ({ value, onChange: (v: string) => onValueChange?.(v) }),
      [value, onValueChange],
    );
    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
  }

  function SelectTrigger({
    children,
    id,
    ...rest
  }: { children?: React.ReactNode; id?: string } & React.HTMLAttributes<HTMLDivElement>) {
    // Render a real <select> so tests can change its value via fireEvent.
    const ctx = React.useContext(Ctx);
    // Collect SelectItem siblings rendered by SelectContent. Tests can read
    // option text by querying role="option".
    return (
      <div data-testid="select-trigger" {...rest}>
        <select
          id={id}
          value={ctx?.value ?? ''}
          onChange={(e) => ctx?.onChange(e.target.value)}
          data-testid="role-select"
        >
          {/* options injected by SelectContent via portal-like sibling */}
        </select>
        <span data-testid="select-value-label">{children}</span>
      </div>
    );
  }

  function SelectValue() {
    const ctx = React.useContext(Ctx);
    return <span>{ctx?.value}</span>;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    // Render the items as native <option>s inside the prior <select>.
    // Since portaling is fake here, just render an invisible listbox so
    // tests can query role="option".
    const ctx = React.useContext(Ctx);
    const items = React.Children.toArray(children) as React.ReactElement<{
      value: string;
      children: React.ReactNode;
    }>[];
    React.useEffect(() => {
      // Inject <option>s into the real <select>. We can't render them as
      // children of <select> via JSX from outside, so do it imperatively.
      const root = document.querySelector('select[data-testid="role-select"]');
      if (!root) return;
      // Clear and rebuild
      root.innerHTML = '';
      for (const child of items) {
        const opt = document.createElement('option');
        opt.value = child.props.value;
        // Children might be a string or React node; coerce to text.
        opt.textContent =
          typeof child.props.children === 'string'
            ? child.props.children
            : String(child.props.children ?? '');
        if (ctx?.value === child.props.value) opt.selected = true;
        root.appendChild(opt);
      }
    }, [items, ctx?.value]);
    return null;
  }

  function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
    // Also render an accessible <li role="option"> off-screen so tests can
    // assert on option labels by role.
    return (
      // biome-ignore lint/a11y: off-screen test-mock fixture so tests can query options by role
      <span role="option" data-value={value}>
        {children}
      </span>
    );
  }

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

// --- Polyfills ----------------------------------------------------------

beforeAll(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
});

beforeEach(() => {
  inviteMemberActionMock.mockClear();
  inviteMemberActionMock.mockResolvedValue({ ok: true });
});

// Note: React Testing Library handles DOM cleanup between tests automatically.

async function openDialog() {
  const { InviteMemberDialog } = await import('./invite-member-dialog');
  render(<InviteMemberDialog />);
  fireEvent.click(screen.getByRole('button', { name: 'invite' }));
  await waitFor(() => {
    expect(screen.getByLabelText('inviteEmailLabel')).toBeInTheDocument();
  });
}

// --- Tests --------------------------------------------------------------

describe('InviteMemberDialog role select', () => {
  it('renders all 8 non-owner system roles as options and excludes owner', async () => {
    await openDialog();

    const options = screen.getAllByRole('option');
    const labels = options.map((o) => o.textContent?.trim());

    expect(labels).toEqual(
      expect.arrayContaining([
        'role:admin',
        'role:viewer',
        'role:bookkeeper',
        'role:sales',
        'role:warehouse',
        'role:chief_accountant',
        'role:cashier',
        'role:buyer',
      ]),
    );
    expect(labels).not.toContain('role:owner');
    expect(options).toHaveLength(8);
  });

  it("defaults the selected role to 'sales'", async () => {
    await openDialog();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('sales');
  });

  it('submits FormData with the picked systemRole', async () => {
    await openDialog();

    const email = screen.getByLabelText('inviteEmailLabel') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'new@example.com' } });

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'cashier' } });

    fireEvent.click(screen.getByRole('button', { name: 'inviteSubmit' }));

    await waitFor(() => {
      expect(inviteMemberActionMock).toHaveBeenCalledTimes(1);
    });

    const firstCall = inviteMemberActionMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    // biome-ignore lint/style/noNonNullAssertion: guarded by expect(firstCall).toBeDefined() above
    const fd = firstCall![0];
    expect(fd.get('email')).toBe('new@example.com');
    expect(fd.get('systemRole')).toBe('cashier');
  });
});
