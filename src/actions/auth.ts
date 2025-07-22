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

  const { userID, password } = validatedFields.data;

  try {
    // IMPORTANT: Replace the URL with your actual login endpoint.
    const url = new URL('http://10.65.8.223:8085/api/validate_login');
    url.searchParams.append('userID', userID);
    url.searchParams.append('password', password);

    const res = await fetch(url.toString(), {
        method: 'GET',
    });

    if (!res.ok) {
        // Handle non-2xx responses (like 401 Unauthorized, 500 Server Error)
        return {
            message: 'Invalid userID or password.',
        }
    }
    
    const data = await res.json();

    // IMPORTANT: Adjust this check based on how your API indicates success.
    // For example, it might be `data.success`, `data.token`, etc.
    if (!data.result) { 
      return {
        message: 'Invalid userID or password.',
      }
    }

    // If login is successful, create a session and redirect.
    await createSession(userID);
    redirect('/dashboard');

  } catch (error) {
    console.error('Login failed:', error);
    return {
        message: 'An unexpected error occurred. Please try again.',
    }
  }
}

export async function logout() {
  'use server'
  await deleteSession()
}
