import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth-context';
import { ErrorBoundary } from './error-boundary';

export function AppLayout() {
  const { user, org, logout, has } = useAuth();

  return (
    <div className="shell">
      <header className="topbar">
        <strong>Pulse</strong>
        <nav>
          {has('responses:submit') && <NavLink to="/survey">Survey</NavLink>}
          {has('summary:read') && <NavLink to="/summary">Summary</NavLink>}
          {has('roles:create') && <NavLink to="/roles">Roles</NavLink>}
          {has('users:create') && <NavLink to="/admin/users">People</NavLink>}
          {has('orgs:update') && <NavLink to="/settings">Settings</NavLink>}
          {has('orgs:create') && <NavLink to="/admin/orgs">Orgs</NavLink>}
          {has('activity:read') && <NavLink to="/activity">Activity</NavLink>}
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
