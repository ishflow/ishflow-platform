// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MarketingV2Boundary } from './marketing-v2-boundary';

const ORIGINAL = process.env.NEXT_PUBLIC_MARKETING_V2;

describe('MarketingV2Boundary', () => {
  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.NEXT_PUBLIC_MARKETING_V2;
    } else {
      process.env.NEXT_PUBLIC_MARKETING_V2 = ORIGINAL;
    }
  });

  it('renders the v2 child by default', () => {
    delete process.env.NEXT_PUBLIC_MARKETING_V2;
    render(<MarketingV2Boundary v2={<div>NEW</div>} legacy={<div>OLD</div>} />);
    expect(screen.getByText('NEW')).toBeDefined();
    expect(screen.queryByText('OLD')).toBeNull();
  });

  it('renders the legacy child when flag is "false"', () => {
    process.env.NEXT_PUBLIC_MARKETING_V2 = 'false';
    render(<MarketingV2Boundary v2={<div>NEW</div>} legacy={<div>OLD</div>} />);
    expect(screen.getByText('OLD')).toBeDefined();
  });
});
