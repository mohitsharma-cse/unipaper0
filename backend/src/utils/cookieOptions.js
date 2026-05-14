const parseBoolean = (value) => {
  if (value === undefined) return undefined;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const getCookieBaseOptions = () => {
  const configuredSecure = parseBoolean(process.env.COOKIE_SECURE);
  const sameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
  const secure = sameSite === 'none'
    || process.env.NODE_ENV === 'production'
    || configuredSecure === true;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/'
  };
};

export const authCookieOptions = () => ({
  ...getCookieBaseOptions(),
  maxAge: 24 * 60 * 60 * 1000
});

export const clearAuthCookieOptions = () => getCookieBaseOptions();
