import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import type { DictKey } from '../i18n';
import { publicAsset } from '../lib/assets';

const MESSAGES: DictKey[] = ['splash.m1', 'splash.m2', 'splash.m3', 'splash.m4', 'splash.ready'];

export function Splash({ onDone }: { onDone: () => void }) {
  const { t, lang } = useI18n();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const messageTimer = window.setInterval(() => {
      setIndex((current) => Math.min(MESSAGES.length - 1, current + 1));
    }, 520);
    const leaveTimer = window.setTimeout(() => setLeaving(true), 2480);
    const doneTimer = window.setTimeout(() => {
      if (!finished.current) {
        finished.current = true;
        onDone();
      }
    }, 2960);
    return () => {
      window.clearInterval(messageTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    setLeaving(true);
    window.setTimeout(onDone, 180);
  };

  return (
    <div className={`splash ${leaving ? 'leaving' : ''}`} role="status" aria-live="polite" aria-label={t('app.loading')}>
      <div className="splash-inner">
        <div className="splash-emblem">
          <img src={publicAsset('brand-emblem.webp')} alt="" width={210} height={210} />
        </div>
        <div>
          <p className="splash-word">Green Owl <em>Labs</em></p>
          <p className="splash-line" key={index}>{t(MESSAGES[index])}</p>
        </div>
        <div className="splash-bar" aria-hidden="true"><span /></div>
        <p className="tiny" style={{ color: 'rgba(248,243,231,.38)', maxWidth: '31ch', lineHeight: 1.5 }}>
          {lang === 'es'
            ? 'Carbono y agua, con la misma vara. Sin atajos.'
            : 'Carbon and water, held to the same standard. No shortcuts.'}
        </p>
      </div>
      <button type="button" className="splash-skip" onClick={finish}>
        {t('app.skip')}
      </button>
    </div>
  );
}
