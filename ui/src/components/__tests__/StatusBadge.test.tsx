import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders upcoming status', () => {
    render(<StatusBadge status="upcoming" />);
    expect(screen.getByText('UPCOMING')).toBeInTheDocument();
  });

  it('renders in-progress status', () => {
    render(<StatusBadge status="in-progress" />);
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
  });

  it('renders completed status', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('COMPLETED ✓')).toBeInTheDocument();
  });

  it('applies animate-pulse to in-progress status', () => {
    render(<StatusBadge status="in-progress" />);
    const badge = screen.getByText('IN PROGRESS');
    expect(badge.className).toContain('animate-pulse');
  });

  it('applies correct color classes for upcoming', () => {
    render(<StatusBadge status="upcoming" />);
    const badge = screen.getByText('UPCOMING');
    expect(badge.className).toContain('bg-gray-200');
  });

  it('applies correct color classes for completed', () => {
    render(<StatusBadge status="completed" />);
    const badge = screen.getByText('COMPLETED ✓');
    expect(badge.className).toContain('bg-green-100');
  });
});

