import { Link } from 'react-router';

export function NotFoundPage({ message = 'Page not found' }: { message?: string }) {
  return (
    <div className="state card">
      <h1>{message}</h1>
      <p className="muted">Check the link you were sent, or start a new event.</p>
      <p>
        <Link to="/" className="button primary">
          Create a new event
        </Link>
      </p>
    </div>
  );
}
