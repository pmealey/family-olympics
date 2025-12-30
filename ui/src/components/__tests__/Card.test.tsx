import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CardBody, CardHeader, CardFooter } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <div>Card content</div>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(
      <Card onClick={handleClick}>
        <div>Clickable card</div>
      </Card>
    );
    
    fireEvent.click(screen.getByText('Clickable card'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies team color border', () => {
    const { container } = render(
      <Card teamColor="pink">
        <div>Team card</div>
      </Card>
    );
    const card = container.firstChild;
    expect(card).toHaveClass('border-team-pink');
  });

  it('applies hover classes when onClick is provided', () => {
    const { container } = render(
      <Card onClick={() => {}}>
        <div>Clickable card</div>
      </Card>
    );
    const card = container.firstChild;
    expect(card).toHaveClass('cursor-pointer');
  });
});

describe('CardBody', () => {
  it('renders children', () => {
    render(
      <CardBody>
        <div>Body content</div>
      </CardBody>
    );
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(
      <CardHeader>
        <div>Header content</div>
      </CardHeader>
    );
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    render(
      <CardFooter>
        <div>Footer content</div>
      </CardFooter>
    );
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });
});

