import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { JudgeProvider } from './contexts';
import { PublicLayout } from './layouts';
import { Home, Schedule, EventDetail, Judge, JudgeEvents, JudgeScoreEntry, Admin } from './pages';

function App() {
  return (
    <JudgeProvider>
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
            path="/judge/events"
            element={
              <PublicLayout>
                <JudgeEvents />
              </PublicLayout>
            }
          />
          <Route
            path="/judge/events/:eventId/score"
            element={
              <PublicLayout>
                <JudgeScoreEntry />
              </PublicLayout>
            }
          />
          <Route
            path="/admin"
            element={<Admin />}
          />
        </Routes>
      </Router>
    </JudgeProvider>
  );
}

export default App;
