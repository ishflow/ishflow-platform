// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MARKETING_ICON_NAMES, MarketingIcon } from './marketing-icons';

describe('MarketingIcon', () => {
  it('exports every icon name from the catalog', () => {
    expect(MARKETING_ICON_NAMES.length).toBeGreaterThanOrEqual(40);
  });

  it('renders an aria-hidden svg by default', () => {
    const { container } = render(<MarketingIcon name="doc" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('stroke')).toBe('currentColor');
  });

  it('respects a custom size prop', () => {
    const { container } = render(<MarketingIcon name="box" size={32} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });

  it('renders every catalog entry without throwing', () => {
    for (const name of MARKETING_ICON_NAMES) {
      const { container } = render(<MarketingIcon name={name} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });
});
