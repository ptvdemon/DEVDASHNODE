'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { createSession, deleteSession } from '@/lib/session'

export type FormState = {
  message: string;
}

const loginSchema = z.object({
  userID: z.string().min(1, { message: "UserID is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export async function login(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = loginSchema.safeParse(
    Object.fromEntries(formData.entries())
  )

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.errors.map((e) => e.message).join(', '),
    }
  }

  const { userID } = validatedFields.data;

  // In a real app, you would validate against the API:
  // const res = await fetch(`http://10.65.8.223:8085/api/validate_login?userID=${userID}&password=${password}`);
  // const data = await res.json();
  // if (!data.result) { ... }
  
  // Mocking success for any login attempt as per the proposal's constraints.
  const loginSuccess = true;

  if (!loginSuccess) {
    return {
      message: 'Invalid userID or password.',
    }
  }

  await createSession(userID);
  
  redirect('/dashboard');
}

export async function logout() {
  'use server'
  await deleteSession()
}
