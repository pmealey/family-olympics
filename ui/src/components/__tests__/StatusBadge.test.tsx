import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders nothing when completed is false', () => {
    const { container } = render(<StatusBadge completed={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when completed is undefined', () => {
    const { container } = render(<StatusBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders completed badge when completed is true', () => {
    render(<StatusBadge completed={true} />);
    expect(screen.getByText('COMPLETED ✓')).toBeInTheDocument();
  });

  it('applies correct color classes for completed', () => {
    render(<StatusBadge completed={true} />);
    const badge = screen.getByText('COMPLETED ✓');
    expect(badge.className).toContain('bg-green-100');
  });

  it('applies custom className', () => {
    render(<StatusBadge completed={true} className="custom-class" />);
    const badge = screen.getByText('COMPLETED ✓');
    expect(badge.className).toContain('custom-class');
  });
});

