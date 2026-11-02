import { Link, useLocation } from 'react-router';
import { AuthLayout } from '../components/AuthLayout';
import { FormAlert } from '../components/FormAlert';
import { PasswordField } from '../components/PasswordField';
import { SubmitButton } from '../components/SubmitButton';
import { TextField } from '../components/TextField';
import { useRegister } from '../hooks/useRegister';
export function RegisterPage() {
  const { field, onSubmit, formError, isSubmitting } = useRegister();
  const { search } = useLocation();
  return (
    <AuthLayout
      title="Create your account"
      subtitle="One backlog, one board, one AI teammate."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to={`/login${search}`}
            className="font-semibold text-[#2f4bff] hover:text-[#253ecc] hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff] rounded"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FormAlert>{formError}</FormAlert>
        <TextField
          label="Name"
          autoComplete="name"
          autoFocus
          placeholder="Alex Johnson"
          {...field('name')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="alex@company.com"
          {...field('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters."
          placeholder="••••••••"
          {...field('password')}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          placeholder="••••••••"
          {...field('confirmPassword')}
        />

        <div className="mt-6">
          <SubmitButton loading={isSubmitting} loadingText="Creating account…">
            Create account
          </SubmitButton>
        </div>
      </form>
    </AuthLayout>
  );
}

