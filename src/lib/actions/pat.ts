'use server';

import { cookies } from 'next/headers';

export async function setTemporaryPat(pat: string) {
    cookies().set('temp_pat', pat, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60, // 1 hour
        path: '/',
    });
}

export async function clearTemporaryPat() {
    cookies().delete('temp_pat');
}
