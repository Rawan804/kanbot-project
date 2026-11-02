import { Link, useLocation } from 'react-router';
import { AuthLayout } from '../components/AuthLayout';
import { FormAlert } from '../components/FormAlert';
import { PasswordField } from '../components/PasswordField';
import { SubmitButton } from '../components/SubmitButton';
import { TextField } from '../components/TextField';
import { useLogin } from '../hooks/useLogin';
import { useAuthStore } from '../store';

export function LoginPage() {
  const { field, onSubmit, formError, isSubmitting } = useLogin();
  const exitReason = useAuthStore((s) => s.exitReason);
  const { search } = useLocation(); // keep ?redirect= when switching to register

  return (
    <AuthLayout
      title="Log in"
      subtitle="Pick up your sprint where you left it."
      footer={
        <>
          New to Kanbot?{' '}
          <Link
            to={`/register${search}`}
            className="font-semibold text-[#2f4bff] hover:text-[#253ecc] hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff] rounded"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        {exitReason === 'expired' && (
          <FormAlert tone="info">Your session has expired. Please log in again.</FormAlert>
        )}
        <FormAlert>{formError}</FormAlert>

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="name@company.com"
          {...field('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...field('password')}
        />

        <div className="mt-6">
          <SubmitButton loading={isSubmitting} loadingText="Logging in…">
            Log in
          </SubmitButton>
        </div>
      </form>
    </AuthLayout>
  );
}

