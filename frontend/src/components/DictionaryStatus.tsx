import React from 'react';
import { useDictionaryContext } from './DictionaryProvider';

export const DictionaryStatus: React.FC = () => {
  const { words, isLoading, error, version, reload, clearCache } =
    useDictionaryContext();

  if (isLoading) {
    return (
      <div
        style={{
          padding: '1rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
          margin: '1rem 0',
        }}
      >
        <h3>Dictionary Status</h3>
        <p>Loading dictionary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '1rem',
          border: '1px solid #ff6b6b',
          borderRadius: '4px',
          margin: '1rem 0',
        }}
      >
        <h3>Dictionary Status</h3>
        <p style={{ color: '#ff6b6b' }}>
          Error: {error?.message || 'Unknown error'}
        </p>
        <button
          onClick={reload}
          style={{ marginTop: '0.5rem', padding: '0.5rem 1rem' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1rem',
        border: '1px solid #51cf66',
        borderRadius: '4px',
        margin: '1rem 0',
      }}
    >
      <h3>Dictionary Status</h3>
      <p>✅ Dictionary loaded successfully!</p>
      <p>
        <strong>Version:</strong> {version}
      </p>
      <p>
        <strong>Word count:</strong> {words.length.toLocaleString()}
      </p>
      <div style={{ marginTop: '1rem' }}>
        <button
          onClick={reload}
          style={{ marginRight: '0.5rem', padding: '0.5rem 1rem' }}
        >
          Reload Dictionary
        </button>
        <button
          onClick={clearCache}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
};
