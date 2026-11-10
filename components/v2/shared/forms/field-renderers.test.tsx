// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  type CustomFieldRendererProps,
  getFieldRenderer,
  registerFieldRenderer,
} from './field-renderers';

describe('field-renderers registry', () => {
  it('returns null for unknown renderer key', () => {
    expect(getFieldRenderer('nonexistent_xyz')).toBeNull();
  });

  it('registers and retrieves a custom renderer', () => {
    function Stub(props: CustomFieldRendererProps) {
      return <div data-testid="stub">{props.field.label.en}</div>;
    }
    registerFieldRenderer('test_stub', Stub);
    const Comp = getFieldRenderer('test_stub');
    expect(Comp).not.toBeNull();
    if (Comp) {
      const { getByTestId } = render(
        <Comp
          field={{ type: 'custom', renderer: 'test_stub', label: { en: 'Hi' } }}
          value={null}
          recordId={null}
          mode="view"
        />,
      );
      expect(getByTestId('stub').textContent).toBe('Hi');
    }
  });
});
