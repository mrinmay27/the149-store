import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Loading from './Loading';

describe('Loading', () => {
  it('renders with default props', () => {
    render(<Loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<Loading text="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { container: small } = render(<Loading size="sm" />);
    expect(small.querySelector('.w-4')).toBeInTheDocument();

    const { container: medium } = render(<Loading size="md" />);
    expect(medium.querySelector('.w-8')).toBeInTheDocument();

    const { container: large } = render(<Loading size="lg" />);
    expect(large.querySelector('.w-16')).toBeInTheDocument();
  });

  it('renders in fullscreen mode', () => {
    const { container } = render(<Loading fullScreen />);
    expect(container.querySelector('.fixed')).toBeInTheDocument();
  });
}); 