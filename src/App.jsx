import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';

// Load the chat bubble immediately instead of lazy loading
import DifyChatBubble from './components/DifyChatBubble';

const App = () => {
  return (
    <div>
      <h1>Pennie AI Playground</h1>
      <ErrorBoundary>
        {/* Removed Suspense wrapper since we are no longer lazy loading */}
        <DifyChatBubble />
      </ErrorBoundary>
    </div>
  );
};

export default App;

