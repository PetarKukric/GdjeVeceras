import { cookies } from 'next/headers';
import { LANG_COOKIE, makeT, normalizeLang, type Lang } from './index';

export async function getLang(): Promise<Lang> {
  try {
    const cookieStore = await cookies();
    return normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
  } catch {
    return 'sr';
  }
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
