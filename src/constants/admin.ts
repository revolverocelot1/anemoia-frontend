export const ADMIN_EMAILS: string[] = [
  'srushtiraj.patil20@vit.edu',
  'srushtirajforgc@gmail.com',
];

export const isUserAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === email.trim().toLowerCase()
  );
};
