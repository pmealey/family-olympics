import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PublicLayout } from './layouts';
import { Home, Schedule, EventDetail, Judge, Admin } from './pages';

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <PublicLayout>
              <Home />
            </PublicLayout>
          }
        />
        <Route
          path="/schedule"
          element={
            <PublicLayout>
              <Schedule />
            </PublicLayout>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <PublicLayout>
              <EventDetail />
            </PublicLayout>
          }
        />
        <Route
          path="/judge"
          element={
            <PublicLayout>
              <Judge />
            </PublicLayout>
          }
        />
        <Route
          path="/admin"
          element={<Admin />}
        />
      </Routes>
    </Router>
  );
}

export default App;
