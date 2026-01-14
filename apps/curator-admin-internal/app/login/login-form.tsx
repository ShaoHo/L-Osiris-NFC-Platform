'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createSession } from './actions';

const initialState = { error: undefined };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? 'Verifying…' : 'Create session'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(createSession, initialState);

  return (
    <form action={formAction} className="stack">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />
      </div>
      <div className="field">
        <label htmlFor="otp">OTP</label>
        <input id="otp" name="otp" type="text" inputMode="numeric" required />
      </div>
      {state?.error ? <div className="error">{state.error}</div> : null}
      <SubmitButton />
    </form>
  );
}
