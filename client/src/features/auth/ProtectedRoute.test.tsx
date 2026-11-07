import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from './store';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'guest', exitReason: null });
  });

  it('redirects guests to login while preserving the intended destination', () => {
    render(
      <MemoryRouter initialEntries={['/private?tab=tasks']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<p>Private content</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
  });

  it('renders the protected content for an authenticated user', () => {
    useAuthStore.setState({ status: 'authenticated' });
    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<p>Private content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Private content')).toBeInTheDocument();
  });
});
