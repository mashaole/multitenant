import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth-context';
import { ErrorBoundary } from './error-boundary';

export function AppLayout() {
  const { user, org, logout, has, hasModule } = useAuth();

  return (
    <div className="shell">
      <header className="topbar">
        <strong>Pulse</strong>
        <nav>
          {has('responses:submit') && hasModule('responses') && (
            <NavLink to="/survey">Survey</NavLink>
          )}
          {has('summary:read') && hasModule('summary') && (
            <NavLink to="/summary">Summary</NavLink>
          )}
          {has('roles:create') && <NavLink to="/roles">Roles</NavLink>}
          {has('users:create') && <NavLink to="/people">People</NavLink>}
          {has('orgs:update') && <NavLink to="/settings">Settings</NavLink>}
          {has('orgs:create') && <NavLink to="/orgs">Orgs</NavLink>}
          {has('activity:read') && hasModule('activity') && (
            <NavLink to="/activity">Activity</NavLink>
          )}
        </nav>
        <div className="who">
          <span>
            {user?.name} · {org?.name}
          </span>
          <button className="btn ghost" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>
      <main>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
