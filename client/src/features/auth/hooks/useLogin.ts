import { login } from '../api/auth.api';
import { loginSchema } from '../schemas';
import { useAuthStore } from '../store';
import { useZodForm } from './useZodForm';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const form = useZodForm(loginSchema, { email: '', password: '' });
  // On success GuestRoute sees `authenticated` and redirects (?redirect= or /projects).
  const onSubmit = form.handleSubmit(async (values) => {
    setSession(await login(values));
  });
  return { ...form, onSubmit };
}
