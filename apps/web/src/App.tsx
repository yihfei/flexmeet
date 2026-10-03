import { Link, Route, Routes } from 'react-router';
import { ApiStatus } from './components/ApiStatus';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventPage } from './pages/EventPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          FlexMeet
        </Link>
        <ApiStatus />
      </header>
      <main>
        <Routes>
          <Route path="/" element={<CreateEventPage />} />
          <Route path="/e/:slug" element={<EventPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
