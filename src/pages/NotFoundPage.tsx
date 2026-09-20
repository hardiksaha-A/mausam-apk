import { tr } from '../i18n/dynamic';
import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

const NotFoundPage: React.FC = () => (
  <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
    <span className="grid place-items-center size-14 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
      <Leaf size={26} />
    </span>
    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{tr('Page not found', 'पेज नहीं मिला')}</h1>
    <p className="text-sm text-[var(--color-text-muted)] max-w-sm">{tr('The page you\'re looking for doesn\'t exist or may have moved.', 'आप जिस पेज को खोज रहे हैं वह मौजूद नहीं है या हट गया है।')}</p>
    <Link
      to="/"
      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 px-4 py-2 text-sm font-medium hover:bg-[var(--color-accent)]/25 transition-colors"
    >
      {tr('Back to Dashboard', 'डैशबोर्ड पर वापस जाएँ')}
    </Link>
  </div>
);

export default NotFoundPage;
