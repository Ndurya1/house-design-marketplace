import { useState } from 'react';
import { getMediaUrl } from '@/api';

export default function PlanImage({ path, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!path || failed) return <div role="img" aria-label={`${alt} preview unavailable`} className={`${className} flex items-center justify-center bg-slate-200 text-sm text-slate-500`}>No preview available</div>;
  return <img src={getMediaUrl(path)} alt={alt} onError={() => setFailed(true)} className={className} />;
}
