import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { JudgeProvider } from './contexts';
import { PublicLayout } from './layouts';
import { Home, Schedule, Gallery, TeamDetail, EventDetail, Judge, JudgeEvents, JudgeScoreEntry, Admin } from './pages';
import { ErrorBoundary } from './components';

function App() {
  return (
    <ErrorBoundary>
      <JudgeProvider>
        <Router basename="/family-olympics">
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
            path="/gallery"
            element={
              <PublicLayout>
                <Gallery />
              </PublicLayout>
            }
          />
          <Route
            path="/gallery/:year"
            element={
              <PublicLayout>
                <Gallery />
              </PublicLayout>
            }
          />
          <Route
            path="/gallery/:year/media/:mediaId"
            element={
              <PublicLayout>
                <Gallery />
              </PublicLayout>
            }
          />
          <Route
            path="/teams/:teamId"
            element={
              <PublicLayout>
                <TeamDetail />
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
          <Route path="/admin/*" element={<Admin />} />
        </Routes>
        </Router>
      </JudgeProvider>
    </ErrorBoundary>
  );
}

export default App;
