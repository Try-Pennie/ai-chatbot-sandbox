import React, { lazy, Suspense } from 'react';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load the chat bubble for better initial load performance
const DifyChatBubble = lazy(() => import('./components/DifyChatBubble'));

const App = () => {
  return (
    <div>
      <h1>Pennie AI Playground</h1>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <DifyChatBubble />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default App;

