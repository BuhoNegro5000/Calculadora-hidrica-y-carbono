import { useI18n } from '../i18n';
import { useApp } from '../store/app';
import { navigate } from '../app/router';
import { Icon } from '../components/Icons';
import { Chip } from '../components/ui';
import { publicAsset } from '../lib/assets';

export function Welcome() {
  const { t, lang } = useI18n();
  const { activeProject, projects } = useApp();

  const L = (es: string, en: string) => (lang === 'es' ? es : en);

  return (
    <div className="welcome">
      <section className="container welcome-hero">
        <div className="welcome-copy anim-up">
          <p className="eyebrow">{t('welcome.eyebrow')}</p>
          <h1>
            {L('Toda huella cuenta.', 'Every footprint counts.')}
            <br />
            <span className="accent">{L('La tuya también.', 'Yours too.')}</span>
          </h1>
          <p className="lede">{t('welcome.sub')}</p>

          <div className="hero-actions">
            {activeProject ? (
              <>
                <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('results')}>
                  {t('nav.results')}
                  <Icon name="arrow-right" size={18} className="arrow" />
                </button>
                <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('measure')}>
                  {t('nav.measure')}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('onboarding')}>
                  {t('welcome.cta')}
                  <Icon name="arrow-right" size={18} className="arrow" />
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  onClick={() => navigate(projects.length ? 'projects' : 'onboarding')}
                >
                  {t('welcome.secondary')}
                </button>
              </>
            )}
          </div>

          <div className="hero-meta">
            <span><Icon name="clock" size={13} /> {L('3 min en modo Rápido', '3 min in Quick mode')}</span>
            <span><Icon name="lock" size={13} /> {L('Sin registro · datos locales', 'No sign-up · local data')}</span>
            <span><Icon name="database" size={13} /> {L('Cada cifra, con fuente', 'Every figure, sourced')}</span>
          </div>
        </div>

        <div className="welcome-visual anim-scale delay-2">
          <div className="specimen">
            <div className="specimen-head">
              <span>GOWL · Field note 001</span>
              <span>{L('Observar, no juzgar', 'Observe, do not judge')}</span>
            </div>
            <div className="specimen-owl">
              <span className="orbit" />
              <span className="orbit b" />
              <img src={publicAsset('brand-emblem.webp')} alt={L('Emblema del búho de Green Owl Labs', 'Green Owl Labs owl emblem')} width={220} height={220} />
            </div>
            <div className="specimen-stats">
              <div><small>{t('welcome.stat1')}</small><strong>{t('welcome.stat1v')}</strong></div>
              <div><small>{t('welcome.stat2')}</small><strong>{t('welcome.stat2v')}</strong></div>
              <div><small>{t('welcome.stat3')}</small><strong>{t('welcome.stat3v')}</strong></div>
              <div><small>{L('Cobertura', 'Coverage')}</small><strong>{L('4 sujetos', '4 subjects')}</strong></div>
            </div>
            <p className="specimen-quote">“{t('welcome.quote')}”</p>
            <div className="specimen-stamp">
              <span><strong>1.0</strong>GOWL<br />2026.10</span>
            </div>
          </div>
        </div>
      </section>

      <div className="standards" aria-label={L('Estándares utilizados', 'Standards used')}>
        <div className="standards-track">
          {[
            'GHG Protocol', 'ISO 14064-1', 'ISO 14046', 'ISO 20121', 'Water Footprint Network',
            'IPCC AR5 / AR6', 'DEFRA 2025', 'WRI Aqueduct', 'AWARE', 'SBTi 1.5 °C',
            'GHG Protocol', 'ISO 14064-1', 'ISO 14046', 'ISO 20121', 'Water Footprint Network',
            'IPCC AR5 / AR6', 'DEFRA 2025', 'WRI Aqueduct', 'AWARE', 'SBTi 1.5 °C',
          ].map((standard, index) => <span key={`${standard}-${index}`}>{standard}</span>)}
        </div>
      </div>

      <section className="container features">
        <div className="section-head">
          <div>
            <p className="eyebrow">{L('Lo que hace distinto a este observatorio', 'What makes this observatory different')}</p>
            <h2>{L('Rigor que se puede leer.', 'Rigour you can read.')}</h2>
            <p className="lede">
              {L('No es una encuesta con una cifra al final. Es un inventario con alcances, colores de agua, incertidumbre y decisiones priorizadas.',
                'It is not a survey with a number at the end. It is an inventory with scopes, water colours, uncertainty and prioritised decisions.')}
            </p>
          </div>
          <Chip tone="accent">{L('Sin greenwashing', 'No greenwashing')}</Chip>
        </div>

        <div className="feature-grid">
          {[
            {
              icon: 'cloud' as const,
              title: t('welcome.feature1'),
              text: L('Scope 1, 2 y 3 con GWP AR5/AR6, Scope 2 dual y factores versionados. El detalle no se esconde en una nota al pie.',
                'Scope 1, 2 and 3 with AR5/AR6 GWP, dual Scope 2 and versioned factors. Detail is not buried in a footnote.'),
            },
            {
              icon: 'droplet' as const,
              title: t('welcome.feature2'),
              text: L('Azul, verde y gris; directa y de cadena de suministro. Porque no toda el agua pesa igual en cada cuenca.',
                'Blue, green and grey; direct and supply-chain. Because not all water weighs the same in every basin.'),
            },
            {
              icon: 'target' as const,
              title: t('welcome.feature3'),
              text: L('Escenarios en vivo, trayectoria 1,5 °C y acciones ordenadas por impacto y costo. Sin promesas mágicas.',
                'Live scenarios, 1.5 °C trajectory and actions ranked by impact and cost. No magic promises.'),
            },
            {
              icon: 'file' as const,
              title: t('welcome.feature4'),
              text: L('CSV, JSON y PDF con cada línea, factor, fuente, año y supuesto. Preparado para revisión, no para postureo.',
                'CSV, JSON and PDF with every line, factor, source, year and assumption. Ready for review, not posturing.'),
            },
          ].map((feature, index) => (
            <article className="feature anim-up" data-index={`0${index + 1}`} key={feature.title} style={{ animationDelay: `${120 + index * 70}ms` }}>
              <span className="feature-icon"><Icon name={feature.icon} size={21} /></span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container">
        <div className="method-band">
          <div>
            <p className="eyebrow" style={{ color: 'rgba(248,243,231,.55)' }}>{L('Método, no magia', 'Method, not magic')}</p>
            <h2>{L('La misma vara para el carbono y el agua.', 'The same standard for carbon and water.')}</h2>
            <p className="mt-4" style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
              {L('Cada resultado se puede reconstruir: actividad × factor × fuente. Si un factor está pendiente, se marca. Si hay un supuesto, se registra. Si el dato no alcanza para un reporte externo, se dice.',
                'Every result can be reconstructed: activity × factor × source. If a factor is pending, it is flagged. If there is an assumption, it is recorded. If the data is not enough for external reporting, we say so.')}
            </p>
            <button type="button" className="btn btn-accent mt-6" onClick={() => navigate('transparency')}>
              {t('transparency.title')}
              <Icon name="arrow-up-right" size={17} />
            </button>
          </div>
          <div className="method-list">
            {[
              [L('Carbono', 'Carbon'), L('GHG Protocol · Scope 2 Guidance · ISO 14064-1 · ISO 20121', 'GHG Protocol · Scope 2 Guidance · ISO 14064-1 · ISO 20121')],
              [L('Agua', 'Water'), L('Water Footprint Network · ISO 14046 · AWARE (screening)', 'Water Footprint Network · ISO 14046 · AWARE (screening)')],
              [L('Gases', 'Gases'), L('IPCC AR5 y AR6, GWP a 100 años, RF de aviación opcional', 'IPCC AR5 and AR6, 100-year GWP, optional aviation RF')],
              [L('Incertidumbre', 'Uncertainty'), L('Propagación por cuadratura, declarada como screening', 'Quadrature propagation, declared as screening')],
              [L('Trazabilidad', 'Traceability'), L('Factor, unidad, región, año, estado y fecha de verificación', 'Factor, unit, region, year, status and verification date')],
            ].map(([label, text]) => (
              <div className="method-item" key={label}>
                <strong>{label}</strong>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="cta-band">
          <div>
            <p className="eyebrow no-rule">{L('Empieza por el principio', 'Start at the beginning')}</p>
            <h2 className="mt-2">{L('Mide primero. Decide después.', 'Measure first. Decide after.')}</h2>
            <p className="lede mt-3">{t('welcome.note')}</p>
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate(activeProject ? 'results' : 'onboarding')}>
            {activeProject ? t('nav.results') : t('welcome.cta')}
            <Icon name="arrow-right" size={18} className="arrow" />
          </button>
        </div>
      </section>
    </div>
  );
}
