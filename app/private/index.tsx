import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { isConfigured } from '../../src/storage/private';

// This route now only redirects to Private Notes, honoring setup/auth flow.
export default function PrivateRedirect() {
  const router = useRouter();
  const { unlocked, redirect } = useLocalSearchParams<{ unlocked?: string; redirect?: string }>();

  useEffect(() => {
    (async () => {
      const configured = await isConfigured();
      const dest = (typeof redirect === 'string' && redirect) ? redirect : '/private/notes';
      if (!configured) {
        router.replace(`/private/setup?redirect=${encodeURIComponent(dest)}`);
        return;
      }
      if (!unlocked) {
        router.replace(`/private/auth?redirect=${encodeURIComponent(dest)}`);
        return;
      }
      router.replace(`${dest}?unlocked=1`);
    })();
  }, [router, unlocked, redirect]);

  return null;
}
