import { register } from '../api/auth.api';
import { registerSchema } from '../schemas';
import { useAuthStore } from '../store';
import { useZodForm } from './useZodForm';

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const form = useZodForm(registerSchema, { name: '', email: '', password: '', confirmPassword: '' });
  const onSubmit = form.handleSubmit(async ({ name, email, password }) => {
    setSession(await register({ name, email, password })); // confirmPassword stays client-side
  });

  return { ...form, onSubmit };
}
