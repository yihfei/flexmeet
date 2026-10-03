import { Link } from 'react-router';

export function NotFoundPage({ message = 'Page not found' }: { message?: string }) {
  return (
    <>
      <h1>{message}</h1>
      <p>
        <Link to="/">Create a new event</Link>
      </p>
    </>
  );
}
